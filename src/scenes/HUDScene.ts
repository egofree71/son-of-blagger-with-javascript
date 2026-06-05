import { Scene } from "phaser";

/**
 * Temporary HUD overlay for the Phaser 4 prototype.
 *
 * The values are still placeholders. The purpose of this scene is to reserve the
 * same lower status area as the Phaser 2 version while GameScene displays and
 * scrolls the map above it.
 */
export class HUDScene extends Scene
{
    constructor()
    {
        super("HUDScene");
    }

    create(): void
    {
        this.add.rectangle(320, 384, 640, 32, 0x000000)
            .setOrigin(0.5);

        this.add.text(16, 374, "MAP DISPLAY", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(212, 374, "NO GAMEPLAY", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(392, 374, "LEVEL 1 START", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });
    }
}
