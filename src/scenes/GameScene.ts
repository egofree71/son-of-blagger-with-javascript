import { GameObjects, Scene } from "phaser";

// GameScene will become the main porting target for level display and gameplay.
// At this shell stage it does not contain real gameplay yet: it only proves that Phaser 4
// can create a scene, display existing assets and run an update loop.
export class GameScene extends Scene
{
    private marker!: GameObjects.Rectangle;
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

        // The title and player images are deliberately only smoke-test assets here.
        // The next migration step should replace this test layout with the real tilemap display.
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

        // Simple moving marker used to confirm that the Phaser update loop is active.
        this.marker = this.add.rectangle(320, 340, 96, 8, 0xffffff);

        // HUDScene runs in parallel, like the future overlay HUD.
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
