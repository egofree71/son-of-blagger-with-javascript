import { Scene } from "phaser";

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
