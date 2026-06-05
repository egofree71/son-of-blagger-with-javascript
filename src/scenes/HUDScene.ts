import { Scene } from "phaser";

// HUDScene is a temporary overlay scene.
// It currently displays fixed placeholder values; later it should receive real score, lives,
// level, hi-score, air and bonus-man updates from GameScene or from a small game-state model.
export class HUDScene extends Scene
{
    constructor()
    {
        super("HUDScene");
    }

    create(): void
    {
        // Draw a simple black strip matching the old lower status area.
        // This helps validate that a Phaser 4 overlay scene can cover the bottom HUD region.
        this.add.rectangle(320, 384, 640, 32, 0x000000)
            .setOrigin(0.5);

        this.add.text(16, 374, "SCORE 000000", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(212, 374, "LIVES 3", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(336, 374, "LEVEL 1", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(464, 374, "AIR 100%", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });
    }
}
