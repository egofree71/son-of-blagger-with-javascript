import { Scene } from "phaser";

/**
 * Loads the first real assets needed by the Phaser 4 prototype.
 *
 * This is the modern replacement for the old Phaser 2 AssetLoader entry point,
 * but only a small subset is loaded for now: the Tiled map, the background
 * tileset used by the main tile layer, the player spritesheet used by the
 * first movement test, the first death animation sprite, and the first animated
 * tile sprites. Gameplay assets will be added as the port grows.
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

        // Keep asset keys explicit while the prototype is still small. A shared
        // asset-key module will make more sense once map, player, HUD and
        // monsters have all moved into the Phaser 4 version.
        this.load.tilemapTiledJSON("son-of-blagger-map", "assets/maps/son-of-blagger.json");
        this.load.image("background-tiles", "assets/tileset/background.png");
        this.load.spritesheet("blagger", "assets/sprites/blagger.png", {
            frameWidth: 48,
            frameHeight: 42
        });

        this.load.spritesheet("blagger-white", "assets/sprites/blagger white.png", {
            frameWidth: 48,
            frameHeight: 42
        });

        this.load.spritesheet("blagger-dying", "assets/sprites/blagger dying.png", {
            frameWidth: 36,
            frameHeight: 42
        });

        this.load.spritesheet("blagger-dying-white", "assets/sprites/blagger dying white.png", {
            frameWidth: 36,
            frameHeight: 42
        });

        this.load.spritesheet("vanishing-platform", "assets/sprites/vanishing platform.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet("ladder-left", "assets/sprites/ladder left.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet("ladder-right", "assets/sprites/ladder right.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet("conveyor-left", "assets/sprites/conveyor left.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet("conveyor-right", "assets/sprites/conveyor right.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet("wave-left", "assets/sprites/wave left.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.spritesheet("wave-right", "assets/sprites/wave right.png", {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create(): void
    {
        this.scene.start("GameScene");
    }
}
