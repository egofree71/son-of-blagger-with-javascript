import { Scene, Tilemaps, Types } from "phaser";
import { Player } from "../entities/Player";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import { findObjectByLevel } from "../tiled/tiledObjects";
import { TileCollisionProbe } from "../tiled/tileCollisionProbe";
import { VanishingPlatforms } from "../entities/VanishingPlatforms";
import { AnimatedLadders } from "../entities/AnimatedLadders";
import { AnimatedConveyors } from "../entities/AnimatedConveyors";
import { DebugPlayerControls } from "../debug/DebugPlayerControls";
import { KeyCollector } from "../entities/KeyCollector";
import { DeadlyTileDetector } from "../entities/DeadlyTileDetector";
import { Data } from "../js/data";
import { PROTOTYPE_KEYS_CHANGED_EVENT, PROTOTYPE_PLAYER_KILLED_EVENT } from "./HUDScene";

/**
 * Displays the imported Tiled map and a minimal animated Player entity in Phaser 4.
 *
 * This scene is still not real gameplay. Its job is to prove that Phaser 4 can
 * load the existing Son of Blagger map, render the main background layer, place
 * Slippery Sid at the same level-1 start position as the Phaser 2 reference, and
 * run a small walking, wall-blocking, falling, jumping, ladder, animated-ladder, conveyor, vanishing-platform, key-collection and deadly-tile test.
 *
 * The real movement rules should still be ported separately from the Phaser 2
 * implementation. In particular, this scene does not yet perform lives, the
 * death animation, monster collisions or exit checks.
 */
export class GameScene extends Scene
{
    private static readonly GAMEPLAY_VIEW_HEIGHT = 368;
    private static readonly STAGE_BACKGROUND_COLOR = 0xc0c0c0;
    private static readonly CURRENT_LEVEL_NUMBER = 1;

    private map?: Tilemaps.Tilemap;
    private player?: Player;
    private collisionProbe?: TileCollisionProbe;
    private vanishingPlatforms?: VanishingPlatforms;
    private animatedLadders?: AnimatedLadders;
    private animatedConveyors?: AnimatedConveyors;
    private keyCollector?: KeyCollector;
    private deadlyTileDetector?: DeadlyTileDetector;
    private debugPlayerControls?: DebugPlayerControls;
    private cursors?: Types.Input.Keyboard.CursorKeys;
    private currentPlayerStart?: TiledObjectLike;
    private temporaryDeathCount = 0;

    constructor()
    {
        super("GameScene");
    }

    create(): void
    {
        // Match the light grey Phaser 2 stage background so empty map areas are
        // not rendered as black during early prototype testing.
        this.cameras.main.setBackgroundColor(GameScene.STAGE_BACKGROUND_COLOR);
        this.cameras.main.setViewport(0, 0, 640, GameScene.GAMEPLAY_VIEW_HEIGHT);

        this.map = this.make.tilemap({ key: "son-of-blagger-map" });

        const backgroundTileset = this.map.addTilesetImage("background", "background-tiles");

        if (!backgroundTileset) {
            this.showFatalPrototypeMessage("Could not bind the Tiled 'background' tileset.");
            return;
        }

        const backgroundLayer = this.map.createLayer("background", backgroundTileset, 0, 0);

        if (!backgroundLayer) {
            this.showFatalPrototypeMessage("Could not create the Tiled 'background' tile layer.");
            return;
        }

        this.collisionProbe = new TileCollisionProbe(backgroundLayer);
        this.vanishingPlatforms = new VanishingPlatforms(this, backgroundLayer, "vanishing-platform");
        this.animatedLadders = new AnimatedLadders(this, backgroundLayer, "ladder-left", "ladder-right");
        this.animatedConveyors = new AnimatedConveyors(this, backgroundLayer, "conveyor-left", "conveyor-right");
        this.keyCollector = new KeyCollector(backgroundLayer);
        this.deadlyTileDetector = new DeadlyTileDetector(backgroundLayer);

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.createPlayerAtLevelStart(GameScene.CURRENT_LEVEL_NUMBER);
        this.addPrototypeOverlayText();

        this.cursors = this.input.keyboard?.createCursorKeys();

        if (DebugPlayerControls.isEnabled()) {
            this.debugPlayerControls = new DebugPlayerControls();

            // The helper attaches browser key listeners, so remove them if the
            // scene is ever restarted during later prototype work.
            this.events.once("shutdown", () => this.debugPlayerControls?.destroy());
            this.events.once("destroy", () => this.debugPlayerControls?.destroy());
        }

        this.scene.launch("HUDScene", {
            debugModeEnabled: this.debugPlayerControls !== undefined,
            keysCollected: this.keyCollector?.collectedKeys ?? 0,
            keysNeeded: this.keysNeededForCurrentLevel(),
            deaths: this.temporaryDeathCount
        });
    }

    update(_time: number, delta: number): void
    {
        if (!this.map || !this.player || !this.collisionProbe || !this.vanishingPlatforms || !this.animatedLadders || !this.animatedConveyors || !this.keyCollector || !this.deadlyTileDetector || !this.cursors) {
            return;
        }

        this.vanishingPlatforms.update(delta);
        this.animatedLadders.update(delta);
        this.animatedConveyors.update(delta);

        const debugFreeMoveActive = this.debugPlayerControls?.update(this.player, this.map, delta) ?? false;

        if (debugFreeMoveActive) {
            return;
        }

        this.player.updatePrototypeMovement(
            this.cursors,
            this.map,
            this.collisionProbe,
            this.vanishingPlatforms
        );

        if (this.killPlayerIfNeeded()) {
            return;
        }

        this.collectKeyIfNeeded();
    }

    private killPlayerIfNeeded(): boolean
    {
        if (!this.player || !this.deadlyTileDetector || !this.keyCollector || !this.currentPlayerStart) {
            return false;
        }

        if (!this.deadlyTileDetector.touchesDeadlyTile(this.player.getDeadlyCollisionBounds())) {
            return false;
        }

        this.temporaryDeathCount += 1;

        // This is only the first trap-collision slice. The real Phaser 2 flow
        // will later play the death animation, update lives and reload the level.
        this.player.resetToTiledStart(this.currentPlayerStart);
        this.keyCollector.reset();

        this.game.events.emit(PROTOTYPE_PLAYER_KILLED_EVENT, {
            deaths: this.temporaryDeathCount
        });
        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: this.keyCollector.collectedKeys,
            keysNeeded: this.keysNeededForCurrentLevel()
        });

        return true;
    }

    private collectKeyIfNeeded(): void
    {
        if (!this.player || !this.keyCollector) {
            return;
        }

        if (!this.keyCollector.collectFromPlayerProbe(this.player.getKeyCollectionBounds())) {
            return;
        }

        // For now only the temporary HUD is notified. Score and level-exit flow
        // will come later when GameController responsibilities move to Phaser 4.
        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: this.keyCollector.collectedKeys,
            keysNeeded: this.keysNeededForCurrentLevel()
        });
    }

    private keysNeededForCurrentLevel(): number
    {
        const levelDefinition = Data.levels[GameScene.CURRENT_LEVEL_NUMBER - 1];

        return levelDefinition?.[0] ?? 0;
    }

    private createPlayerAtLevelStart(levelNumber: number): void
    {
        if (!this.map) {
            return;
        }

        const playerStart = findObjectByLevel(this.map, "player", levelNumber);

        if (!playerStart) {
            this.showFatalPrototypeMessage(`Could not find the level-${levelNumber} player object in the Tiled map.`);
            return;
        }

        this.currentPlayerStart = playerStart;
        this.player = new Player(this, "blagger");
        this.player.resetToTiledStart(playerStart);

        this.followPlayer(this.player);
    }

    private followPlayer(player: Player): void
    {
        const camera = this.cameras.main;

        // Keep the camera inside the imported Tiled map. The HUD uses a separate
        // scene, so this camera only owns the upper gameplay viewport.
        camera.setBounds(0, 0, this.map?.widthInPixels ?? 0, this.map?.heightInPixels ?? 0);

        // Round camera scrolling to whole pixels while following the player.
        // Sub-pixel camera scroll makes pixel-art tile edges shimmer.
        camera.startFollow(player.getSprite(), true, 1, 1);

        const playerCenter = player.getCenter();
        camera.centerOn(Math.round(playerCenter.x), Math.round(playerCenter.y));
    }

    private addPrototypeOverlayText(): void
    {
        // Fixed-camera text makes the current prototype state visible without
        // changing the map or player scroll position.
        this.add.text(8, 8, "Player movement prototype — arrows move, space jumps", {
            fontFamily: "Arial",
            fontSize: "13px",
            color: "#ffffff",
            backgroundColor: "#000000"
        }).setScrollFactor(0);
    }

    private showFatalPrototypeMessage(message: string): void
    {
        this.add.text(320, 180, message, {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: 560 }
        }).setOrigin(0.5);
    }
}
