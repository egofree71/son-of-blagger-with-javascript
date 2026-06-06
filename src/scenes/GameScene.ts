import { Scene, Tilemaps, Types } from "phaser";
import { Player } from "../entities/Player";
import { findObjectByLevel } from "../tiled/tiledObjects";
import { TileCollisionProbe } from "../tiled/tileCollisionProbe";

/**
 * Displays the imported Tiled map and a minimal animated Player entity in Phaser 4.
 *
 * This scene is still not real gameplay. Its job is to prove that Phaser 4 can
 * load the existing Son of Blagger map, render the main background layer, place
 * Slippery Sid at the same level-1 start position as the Phaser 2 reference, and
 * run a small walking, wall-blocking and falling test.
 *
 * The real movement rules should still be ported separately from the Phaser 2
 * implementation. In particular, this scene does not yet perform jumping,
 * ladders, deadly falls, slides, conveyors, key collection or exit checks.
 */
export class GameScene extends Scene
{
    private static readonly GAMEPLAY_VIEW_HEIGHT = 368;
    private static readonly STAGE_BACKGROUND_COLOR = 0xc0c0c0;

    private map?: Tilemaps.Tilemap;
    private player?: Player;
    private collisionProbe?: TileCollisionProbe;
    private cursors?: Types.Input.Keyboard.CursorKeys;

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

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.createPlayerAtLevelStart(1);
        this.addPrototypeOverlayText();

        this.cursors = this.input.keyboard?.createCursorKeys();
        this.scene.launch("HUDScene");
    }

    update(): void
    {
        if (!this.map || !this.player || !this.collisionProbe || !this.cursors) {
            return;
        }

        this.player.updatePrototypeMovement(this.cursors, this.map, this.collisionProbe);
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
        this.add.text(8, 8, "Player falling prototype — left/right arrows move Sid", {
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
