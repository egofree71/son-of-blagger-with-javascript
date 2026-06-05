import { Scene } from "phaser";

/**
 * Loads the first real assets needed by the Phaser 4 prototype.
 *
 * This is the modern replacement for the old Phaser 2 AssetLoader entry point,
 * but only a small subset is loaded for now: the Tiled map, the background
 * tileset used by the main tile layer, and the player spritesheet used by the
 * first animation test. Gameplay assets will be added as the port grows.
 */
export class PreloadScene extends Scene
{
    constructor()
    {
        super("PreloadScene");
    }

    preload(): void
    {
        this.cameras.main.setBackgroundColor(0x000000);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        this.add.text(centerX, centerY - 48, "Loading Phaser 4 player prototype...", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#ffffff"
        }).setOrigin(0.5);

        const barBackground = this.add.rectangle(centerX, centerY, 320, 24)
            .setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(centerX - 158, centerY, 4, 18, 0xffffff)
            .setOrigin(0, 0.5);

        this.load.on("progress", (progress: number) => {
            bar.width = 4 + 316 * progress;
        });

        this.load.on("complete", () => {
            barBackground.destroy();
            bar.destroy();
        });

        /**
         * Asset keys are intentionally explicit instead of reusing the old global
         * constants. The prototype can later converge on a cleaner asset-key module
         * once the map, player and monsters are all loading correctly.
         */
        this.load.tilemapTiledJSON("son-of-blagger-map", "assets/maps/son-of-blagger.json");
        this.load.image("background-tiles", "assets/tileset/background.png");
        this.load.spritesheet("blagger", "assets/sprites/blagger.png", {
            frameWidth: 48,
            frameHeight: 42
        });
    }

    create(): void
    {
        this.scene.start("GameScene");
    }
}
