import { Scene, Tilemaps, Types } from "phaser";
import { Player } from "../entities/Player";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import { findObjectByLevel } from "../tiled/tiledObjects";
import { TileCollisionProbe } from "../tiled/tileCollisionProbe";
import { VanishingPlatforms } from "../entities/VanishingPlatforms";
import { AnimatedLadders } from "../entities/AnimatedLadders";
import { AnimatedConveyors } from "../entities/AnimatedConveyors";
import { AnimatedWavePlatforms } from "../entities/AnimatedWavePlatforms";
import { DebugPlayerControls } from "../debug/DebugPlayerControls";
import { DebugConsole } from "../debug/DebugConsole";
import type { PrototypeDebugStatus } from "../debug/DebugConsole";
import { KeyCollector } from "../entities/KeyCollector";
import { DeadlyTileDetector } from "../entities/DeadlyTileDetector";
import { PlayerDeathSequence } from "../entities/PlayerDeathSequence";
import { ExitDetector } from "../entities/ExitDetector";
import { MonsterManager } from "../entities/MonsterManager";
import { Data } from "../js/data";
import { HUD_STATE_CHANGED_EVENT, PROTOTYPE_EXIT_CHANGED_EVENT, PROTOTYPE_KEYS_CHANGED_EVENT, PROTOTYPE_PLAYER_KILLED_EVENT } from "./HUDScene";

/**
 * Displays the imported Tiled map and a minimal animated Player entity in Phaser 4.
 *
 * This scene is still not real gameplay. Its job is to prove that Phaser 4 can
 * load the existing Son of Blagger map, render the main background layer, place
 * Slippery Sid at the same level-1 start position as the Phaser 2 reference, and
 * run a small walking, wall-blocking, falling, jumping, ladder, animated-ladder, conveyor, animated-wave-platform, vanishing-platform, key-collection, deadly-tile and monster test.
 *
 * The real movement rules should still be ported separately from the Phaser 2
 * implementation. In particular, this scene does not yet perform lives or
 * level transitions.
 */
export class GameScene extends Scene
{
    private static readonly GAMEPLAY_VIEW_HEIGHT = 200;
    private static readonly STAGE_BACKGROUND_COLOR = 0xc0c0c0;
    private static readonly CURRENT_LEVEL_NUMBER = 1;
    private static readonly INITIAL_LIVES = 3;
    private static readonly DEFAULT_AIR_LEVEL = 480;
    private static readonly KEY_SCORE_INCREMENT = 200;

    private map?: Tilemaps.Tilemap;
    private player?: Player;
    private collisionProbe?: TileCollisionProbe;
    private vanishingPlatforms?: VanishingPlatforms;
    private animatedLadders?: AnimatedLadders;
    private animatedConveyors?: AnimatedConveyors;
    private animatedWavePlatforms?: AnimatedWavePlatforms;
    private keyCollector?: KeyCollector;
    private deadlyTileDetector?: DeadlyTileDetector;
    private playerDeathSequence?: PlayerDeathSequence;
    private exitDetector?: ExitDetector;
    private monsterManager?: MonsterManager;
    private debugPlayerControls?: DebugPlayerControls;
    private debugConsole?: DebugConsole;
    private cursors?: Types.Input.Keyboard.CursorKeys;
    private currentPlayerStart?: TiledObjectLike;
    private temporaryDeathCount = 0;
    private temporaryExitReached = false;
    private temporaryScore = 0;
    private readonly temporaryLives = GameScene.INITIAL_LIVES;
    private readonly temporaryHiScore = GameScene.loadStoredHiScore();
    private temporaryAirLevel = GameScene.DEFAULT_AIR_LEVEL;

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
        this.animatedWavePlatforms = new AnimatedWavePlatforms(this, backgroundLayer, "wave-left", "wave-right");
        this.keyCollector = new KeyCollector(backgroundLayer);
        this.deadlyTileDetector = new DeadlyTileDetector(backgroundLayer);
        this.playerDeathSequence = new PlayerDeathSequence(this, "blagger-dying", "blagger-dying-white");
        this.monsterManager = new MonsterManager(this, this.map, GameScene.CURRENT_LEVEL_NUMBER);

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.createPlayerAtLevelStart(GameScene.CURRENT_LEVEL_NUMBER);
        this.exitDetector = this.createExitDetectorForLevel(GameScene.CURRENT_LEVEL_NUMBER);

        if (!this.exitDetector) {
            return;
        }

        this.addPrototypeOverlayText();

        this.cursors = this.input.keyboard?.createCursorKeys();

        if (DebugPlayerControls.isEnabled()) {
            this.debugPlayerControls = new DebugPlayerControls();
            this.debugConsole = new DebugConsole(this);
            this.debugConsole.install();

            // Debug helpers attach browser-level state, so remove everything if
            // the scene is restarted during later prototype work.
            this.events.once("shutdown", () => this.destroyDebugHelpers());
            this.events.once("destroy", () => this.destroyDebugHelpers());
        }

        this.scene.launch("HUDScene", {
            debugModeEnabled: this.debugPlayerControls !== undefined,
            lives: this.temporaryLives,
            score: this.temporaryScore,
            hiScore: this.temporaryHiScore,
            levelNumber: GameScene.CURRENT_LEVEL_NUMBER,
            airLevel: this.temporaryAirLevel,
            hasBonusMan: false
        });
    }

    update(_time: number, delta: number): void
    {
        if (!this.map || !this.player || !this.collisionProbe || !this.vanishingPlatforms || !this.animatedLadders || !this.animatedConveyors || !this.animatedWavePlatforms || !this.keyCollector || !this.deadlyTileDetector || !this.playerDeathSequence || !this.exitDetector || !this.monsterManager || !this.cursors) {
            return;
        }

        this.vanishingPlatforms.update(delta);
        this.animatedLadders.update(delta);
        this.animatedConveyors.update(delta);
        this.animatedWavePlatforms.update(delta);
        this.playerDeathSequence.update(delta);

        if (this.playerDeathSequence.isPlaying()) {
            return;
        }

        // Match the Phaser 2 update order: monsters move before the player
        // resolves this frame's interaction checks.
        this.monsterManager.update();

        const debugFreeMoveActive = this.debugPlayerControls?.update(this.player, this.map, delta) ?? false;

        if (debugFreeMoveActive) {
            return;
        }

        const movementResult = this.player.updatePrototypeMovement(
            this.cursors,
            this.map,
            this.collisionProbe,
            this.vanishingPlatforms
        );

        if (movementResult.playerKilledByDeadlyFall) {
            this.startTemporaryPlayerDeath();
            return;
        }

        if (this.killPlayerIfNeeded()) {
            return;
        }

        this.collectKeyIfNeeded();
        this.checkExitIfNeeded();
    }

    /**
     * Collects all keys from the browser console when `?debug=1` is enabled.
     */
    collectAllKeysForDebug(): void
    {
        if (!this.keyCollector) {
            return;
        }

        this.keyCollector.collectAllForDebug(this.keysNeededForCurrentLevel());
        this.temporaryExitReached = false;

        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: this.keyCollector.collectedKeys,
            keysNeeded: this.keysNeededForCurrentLevel()
        });
        this.emitTemporaryExitState();
    }

    /**
     * Marks the temporary level exit as reached from the browser console.
     */
    finishLevelForDebug(): void
    {
        this.collectAllKeysForDebug();
        this.temporaryExitReached = true;
        this.emitTemporaryExitState();
    }

    /**
     * Resets the current prototype level state from the browser console.
     */
    resetLevelForDebug(): void
    {
        if (!this.player || !this.keyCollector || !this.currentPlayerStart) {
            return;
        }

        this.player.resetToTiledStart(this.currentPlayerStart);
        this.monsterManager?.reset();
        this.keyCollector.reset();
        this.temporaryExitReached = false;
        this.temporaryAirLevel = GameScene.DEFAULT_AIR_LEVEL;

        this.emitHUDState();

        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: this.keyCollector.collectedKeys,
            keysNeeded: this.keysNeededForCurrentLevel()
        });
        this.emitTemporaryExitState();
    }

    /**
     * Returns compact debug state for browser-console inspection.
     */
    getPrototypeDebugStatus(): PrototypeDebugStatus
    {
        const sprite = this.player?.getSprite();

        return {
            debugMode: this.debugPlayerControls !== undefined,
            level: GameScene.CURRENT_LEVEL_NUMBER,
            keysCollected: this.keyCollector?.collectedKeys ?? 0,
            keysNeeded: this.keysNeededForCurrentLevel(),
            exitReady: this.hasCollectedAllKeys(),
            exitReached: this.temporaryExitReached,
            deaths: this.temporaryDeathCount,
            lives: this.temporaryLives,
            score: this.temporaryScore,
            hiScore: this.temporaryHiScore,
            airLevel: this.temporaryAirLevel,
            monstersLoaded: this.monsterManager?.count ?? 0,
            deathSequencePlaying: this.playerDeathSequence?.isPlaying() ?? false,
            player: sprite
                ? {
                    x: Math.round(sprite.x),
                    y: Math.round(sprite.y)
                }
                : null
        };
    }

    private killPlayerIfNeeded(): boolean
    {
        if (!this.player || !this.deadlyTileDetector || !this.monsterManager || !this.playerDeathSequence) {
            return false;
        }

        const touchesDeadlyTile = this.deadlyTileDetector.touchesDeadlyTile(this.player.getDeadlyCollisionBounds());
        const touchesMonster = this.monsterManager.touchesPlayer(this.player.getBodyCollisionBounds());

        if (!touchesDeadlyTile && !touchesMonster) {
            return false;
        }

        return this.startTemporaryPlayerDeath();
    }

    private startTemporaryPlayerDeath(): boolean
    {
        if (!this.player || !this.playerDeathSequence) {
            return false;
        }

        this.playerDeathSequence.start(this.player, () => this.finishTemporaryPlayerDeath());
        return true;
    }

    private finishTemporaryPlayerDeath(): void
    {
        if (!this.player || !this.keyCollector || !this.currentPlayerStart) {
            return;
        }

        this.temporaryDeathCount += 1;
        this.temporaryExitReached = false;
        this.temporaryAirLevel = GameScene.DEFAULT_AIR_LEVEL;

        // This is still a prototype consequence of death: lives and game-over are
        // not implemented yet, so the level is simply reset after the animation.
        this.player.resetToTiledStart(this.currentPlayerStart);
        this.monsterManager?.reset();
        this.keyCollector.reset();

        this.emitHUDState();

        this.game.events.emit(PROTOTYPE_PLAYER_KILLED_EVENT, {
            deaths: this.temporaryDeathCount
        });
        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: this.keyCollector.collectedKeys,
            keysNeeded: this.keysNeededForCurrentLevel()
        });
        this.emitTemporaryExitState();
    }

    private collectKeyIfNeeded(): void
    {
        if (!this.player || !this.keyCollector) {
            return;
        }

        if (!this.keyCollector.collectFromPlayerProbe(this.player.getKeyCollectionBounds())) {
            return;
        }

        // Score is still temporary, but key collection already uses the original
        // 200-point increment so the new HUD can be tested with real values.
        this.temporaryScore += GameScene.KEY_SCORE_INCREMENT;
        this.emitHUDState();

        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: this.keyCollector.collectedKeys,
            keysNeeded: this.keysNeededForCurrentLevel()
        });
        this.emitTemporaryExitState();
    }

    private checkExitIfNeeded(): void
    {
        if (!this.player || !this.exitDetector || this.temporaryExitReached || !this.hasCollectedAllKeys()) {
            return;
        }

        if (!this.exitDetector.touchesPlayer(this.player.getBodyCollisionBounds())) {
            return;
        }

        // The real end-level transition is not ported yet. For now, mark the
        // exit as reached once and keep the prototype playable for further tests.
        this.temporaryExitReached = true;
        this.emitTemporaryExitState();
    }

    private emitTemporaryExitState(): void
    {
        this.game.events.emit(PROTOTYPE_EXIT_CHANGED_EVENT, {
            exitReady: this.hasCollectedAllKeys(),
            exitReached: this.temporaryExitReached
        });
    }


    private emitHUDState(): void
    {
        this.game.events.emit(HUD_STATE_CHANGED_EVENT, {
            lives: this.temporaryLives,
            score: this.temporaryScore,
            hiScore: this.temporaryHiScore,
            levelNumber: GameScene.CURRENT_LEVEL_NUMBER,
            airLevel: this.temporaryAirLevel,
            hasBonusMan: false
        });
    }

    private static loadStoredHiScore(): number
    {
        const storedHiScore = window.localStorage.getItem("hiScore");
        return storedHiScore ? Number(storedHiScore) : 0;
    }

    private hasCollectedAllKeys(): boolean
    {
        return (this.keyCollector?.collectedKeys ?? 0) >= this.keysNeededForCurrentLevel();
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
        this.player = new Player(this, "blagger", "blagger-white");
        this.player.resetToTiledStart(playerStart);

        this.followPlayer(this.player);
    }

    private createExitDetectorForLevel(levelNumber: number): ExitDetector | undefined
    {
        if (!this.map) {
            return undefined;
        }

        const exitObject = findObjectByLevel(this.map, "end level", levelNumber);

        if (!exitObject) {
            this.showFatalPrototypeMessage(`Could not find the level-${levelNumber} exit object in the Tiled map.`);
            return undefined;
        }

        return new ExitDetector(exitObject);
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

    private destroyDebugHelpers(): void
    {
        this.debugPlayerControls?.destroy();
        this.debugConsole?.destroy();
        this.debugPlayerControls = undefined;
        this.debugConsole = undefined;
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
