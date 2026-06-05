import { Scene } from "phaser";

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

        this.add.text(centerX, centerY - 48, "Loading Phaser 4 prototype...", {
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

        // Assets are still served from public/assets by Vite.
        // This validates that Phaser 4 can load from the existing asset folder.
        this.load.image("title", "assets/sprites/title.png");
        this.load.image("player-preview", "assets/sprites/blagger.png");
    }

    create(): void
    {
        this.scene.start("GameScene");
    }
}
