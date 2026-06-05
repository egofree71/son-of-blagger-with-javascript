import { Scene } from "phaser";

export class GameScene extends Scene
{
    private marker: any;
    private markerDirection = 1;

    constructor()
    {
        super("GameScene");
    }

    create(): void
    {
        this.cameras.main.setBackgroundColor(0x202020);

        this.add.text(320, 32, "Son of Blagger", {
            fontFamily: "Arial",
            fontSize: "26px",
            color: "#ffffff"
        }).setOrigin(0.5);

        this.add.image(320, 92, "title")
            .setOrigin(0.5)
            .setScale(2);

        this.add.image(320, 190, "player-preview")
            .setOrigin(0.5)
            .setScale(2);

        this.add.text(320, 270, "Phaser 4 prototype shell", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#ffffff"
        }).setOrigin(0.5);

        this.add.text(320, 302, "No gameplay port yet — this only proves the modern runtime starts.", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#cccccc"
        }).setOrigin(0.5);

        this.marker = this.add.rectangle(320, 340, 96, 8, 0xffffff);

        // HUDScene runs in parallel, like a future overlay HUD.
        this.scene.launch("HUDScene");
    }

    update(): void
    {
        this.marker.x += this.markerDirection;

        if (this.marker.x > 420 || this.marker.x < 220) {
            this.markerDirection *= -1;
        }
    }
}
