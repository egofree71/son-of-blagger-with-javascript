import { Scene } from "phaser";

/**
 * Temporary HUD overlay for the Phaser 4 prototype.
 *
 * The values are still placeholders. The purpose of this scene is to reserve the
 * same lower status area as the Phaser 2 version while GameScene displays and
 * scrolls the map above it. The real bitmap-style HUD should be ported later.
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

        this.add.text(16, 374, "PLAYER WALK", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(220, 374, "NO COLLISION", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(410, 374, "LEVEL 1", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });
    }
}
