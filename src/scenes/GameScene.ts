import { Scene, Tilemaps } from "phaser";
import { Player } from "../entities/Player";
import { findObjectByLevel } from "../tiled/tiledObjects";

/**
 * Displays the imported Tiled map and a minimal Player entity in Phaser 4.
 *
 * This scene is still not gameplay. Its job is to prove that Phaser 4 can load
 * the existing Son of Blagger map, render the main background layer, and place a
 * player object at the same level-1 start position as the Phaser 2 reference.
 *
 * Keyboard camera scrolling is included as a temporary inspection helper, not as
 * future gameplay input. The real player movement should be ported separately
 * once the map rendering and player placement are stable.
 */
export class GameScene extends Scene
{
    private static readonly GAMEPLAY_VIEW_HEIGHT = 368;
    private static readonly CAMERA_SCROLL_SPEED = 6;
    private static readonly STAGE_BACKGROUND_COLOR = 0xc0c0c0;

    private map?: Tilemaps.Tilemap;
    private player?: Player;
    private cursors?: any;

    constructor()
    {
        super("GameScene");
    }

    create(): void
    {
        // Match the light grey Phaser 2 stage background so empty map areas are not rendered as black.
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

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.createPlayerAtLevelStart(1);
        this.addPrototypeOverlayText();

        this.cursors = this.input.keyboard?.createCursorKeys();
        this.scene.launch("HUDScene");
    }

    update(): void
    {
        if (!this.map || !this.cursors) {
            return;
        }

        let deltaX = 0;
        let deltaY = 0;

        if (this.cursors.left?.isDown) {
            deltaX -= GameScene.CAMERA_SCROLL_SPEED;
        }

        if (this.cursors.right?.isDown) {
            deltaX += GameScene.CAMERA_SCROLL_SPEED;
        }

        if (this.cursors.up?.isDown) {
            deltaY -= GameScene.CAMERA_SCROLL_SPEED;
        }

        if (this.cursors.down?.isDown) {
            deltaY += GameScene.CAMERA_SCROLL_SPEED;
        }

        if (deltaX !== 0 || deltaY !== 0) {
            this.scrollCameraBy(deltaX, deltaY);
        }
    }

    /**
     * Creates the prototype Player entity and places it on the Tiled start object
     * for the requested level.
     */
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

        this.player = new Player(this, "player-right");
        this.player.resetToTiledStart(playerStart);

        this.centerCameraOnPlayer(this.player);
    }

    /**
     * Places the gameplay camera around the player while keeping the future HUD
     * strip outside the gameplay viewport.
     */
    private centerCameraOnPlayer(player: Player): void
    {
        const playerCenter = player.getCenter();
        this.cameras.main.centerOn(playerCenter.x, playerCenter.y);
    }

    /**
     * Temporary camera panning helper used only to inspect the large imported map.
     */
    private scrollCameraBy(deltaX: number, deltaY: number): void
    {
        if (!this.map) {
            return;
        }

        const camera = this.cameras.main;

        // The imported Tiled map is larger than the visible gameplay camera.
        // Clamp this temporary inspection scroll so arrow-key panning never
        // reveals empty space beyond the real map bounds.
        const maxScrollX = Math.max(0, this.map.widthInPixels - camera.width);
        const maxScrollY = Math.max(0, this.map.heightInPixels - camera.height);

        camera.setScroll(
            this.clamp(camera.scrollX + deltaX, 0, maxScrollX),
            this.clamp(camera.scrollY + deltaY, 0, maxScrollY)
        );
    }

    private clamp(value: number, min: number, max: number): number
    {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Fixed-camera text makes the current prototype state visible without
     * affecting the map scroll position.
     */
    private addPrototypeOverlayText(): void
    {
        this.add.text(8, 8, "Tilemap + player prototype — arrow keys move camera", {
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
