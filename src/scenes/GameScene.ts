import { GameObjects, Scene, Tilemaps } from "phaser";

interface PrototypeTiledObject
{
    x: number;
    y: number;
    width?: number;
    height?: number;
    name?: string;
    properties?: Record<string, unknown> | Array<{ name: string; value: unknown }>;
}

/**
 * Displays the current Tiled map inside a Phaser 4 scene.
 *
 * This scene is still not gameplay. Its only job is to prove that Phaser 4 can
 * load the existing Son of Blagger JSON map, bind the current background tileset,
 * create the main tile layer, and read the level-1 player start object.
 *
 * Keyboard camera scrolling is included as a temporary inspection helper, not as
 * future gameplay input. The real player movement should be ported separately
 * once the map rendering is known to be correct.
 */
export class GameScene extends Scene
{
    private static readonly GAMEPLAY_VIEW_HEIGHT = 368;
    private static readonly CAMERA_SCROLL_SPEED = 6;
    private static readonly PLAYER_TILED_Y_OFFSET = 42;
    private static readonly STAGE_BACKGROUND_COLOR = 0xc0c0c0;

    private map?: Tilemaps.Tilemap;
    private backgroundLayer?: Tilemaps.TilemapLayer;
    private playerStartMarker?: GameObjects.Image;
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

        this.backgroundLayer = this.map.createLayer("background", backgroundTileset, 0, 0) ?? undefined;

        if (!this.backgroundLayer) {
            this.showFatalPrototypeMessage("Could not create the Tiled 'background' tile layer.");
            return;
        }

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        const playerStart = this.findObjectByLevel(this.map, "player", 1);

        if (playerStart) {
            this.playerStartMarker = this.add.image(
                playerStart.x,
                playerStart.y - GameScene.PLAYER_TILED_Y_OFFSET,
                "player-start"
            ).setOrigin(0, 0);

            this.centerCameraOnObject(playerStart);
        } else {
            this.showFatalPrototypeMessage("Could not find the level-1 player object in the Tiled map.");
        }

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
     * Reads a Tiled object layer and returns the first object whose `level`
     * property matches the requested level number.
     */
    private findObjectByLevel(map: Tilemaps.Tilemap, layerName: string, levelNumber: number): PrototypeTiledObject | undefined
    {
        const objectLayer = map.getObjectLayer(layerName);

        if (!objectLayer) {
            return undefined;
        }

        return (objectLayer.objects as PrototypeTiledObject[]).find((object) => {
            return String(this.getTiledProperty(object, "level")) === String(levelNumber);
        });
    }

    /**
     * Supports both old Tiled JSON property objects and newer Phaser-parsed
     * property arrays. The current map uses the old object-shaped properties,
     * but this helper keeps the prototype tolerant while we inspect Phaser 4.
     */
    private getTiledProperty(object: PrototypeTiledObject, propertyName: string): unknown
    {
        const properties = object.properties;

        if (!properties) {
            return undefined;
        }

        if (Array.isArray(properties)) {
            return properties.find((property) => property.name === propertyName)?.value;
        }

        return properties[propertyName];
    }

    /**
     * Places the gameplay camera around the level start marker while keeping the
     * future HUD strip outside the gameplay viewport.
     */
    private centerCameraOnObject(object: PrototypeTiledObject): void
    {
        const markerCenterX = object.x + (object.width ?? 0) / 2;
        const markerCenterY = object.y - GameScene.PLAYER_TILED_Y_OFFSET + (object.height ?? 0) / 2;

        this.cameras.main.centerOn(markerCenterX, markerCenterY);
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
        this.add.text(8, 8, "Tilemap display prototype — arrow keys move camera", {
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
