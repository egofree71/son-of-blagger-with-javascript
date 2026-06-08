import { Scene } from "phaser";
import { GameAudio } from "../audio/GameAudio";

/**
 * Loads all assets required by the Phaser 4 runtime.
 *
 * Asset keys are kept close to their filenames and Tiled object types so scene
 * setup and object loading can stay explicit and easy to inspect.
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

        this.add.text(centerX, centerY - 48, "Loading Son of Blagger...", {
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

        // Keep asset keys explicit here because several keys are also used by
        // Tiled object types and debug tools.
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

        this.load.spritesheet("explosion", "assets/sprites/explosion.png", {
            frameWidth: 48,
            frameHeight: 42
        });

        this.load.spritesheet("reverse-explosion", "assets/sprites/reverse explosion.png", {
            frameWidth: 48,
            frameHeight: 42
        });

        this.load.image("blagger-font", "assets/tileset/fonts.png");

        this.load.spritesheet("bonus-man", "assets/sprites/bonus man.png", {
            frameWidth: 112,
            frameHeight: 14
        });

        this.load.image("title", "assets/sprites/title.png");
        this.load.image("game-over", "assets/sprites/game over.png");
        this.load.image("touch-left-button", "assets/sprites/left button.png");
        this.load.image("touch-right-button", "assets/sprites/right button.png");
        this.load.image("touch-jump-button", "assets/sprites/up button.png");
        GameAudio.preload(this);

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

        const monsterTextureKeys = [
            "shoe",
            "heart",
            "mouth",
            "toothbrush",
            "scissors",
            "ghost",
            "peach",
            "dial",
            "candle",
            "tape",
            "tribble",
            "bird",
            "bus",
            "cup",
            "plane",
            "scare crow",
            "flag",
            "skull",
            "keyboard",
            "phone",
            "commodore",
            "alien_2",
            "alien_3"
        ];

        for (const monsterTextureKey of monsterTextureKeys) {
            // Monster object types in Tiled use these exact keys, including names
            // with spaces such as "scare crow". Keep them explicit for now.
            this.load.spritesheet(monsterTextureKey, `assets/sprites/${monsterTextureKey}.png`, {
                frameWidth: 48,
                frameHeight: 42
            });
        }
    }

    create(): void
    {
        this.scene.start("TitleScene");
    }
}
