import { Scene } from "phaser";
import { RetroHudText } from "../ui/RetroHudText";

const FONT_TEXTURE_KEY = "blagger-font";

/**
 * Introduction/title screen for the Phaser 4 port.
 *
 * The original Phaser 2 flow shows the title logo, waits for any key to start,
 * and opens the help screen when the player presses H. Keeping this as a small
 * scene avoids loading gameplay objects before the player has actually started
 * a new run.
 */
export class TitleScene extends Scene
{
    constructor()
    {
        super("TitleScene");
    }

    create(): void
    {
        this.cameras.main.setBackgroundColor(0x000000);
        this.add.rectangle(0, 0, 640, 400, 0x000000).setOrigin(0);
        this.add.image(180, 50, "title").setOrigin(0);

        const prompt = new RetroHudText(this, FONT_TEXTURE_KEY, 32, 176, 16, 16, 0xffffff);
        prompt.setText("press any key to start or h for help");

        this.input.keyboard?.once("keydown", (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "h") {
                this.scene.start("HelpScene");
                return;
            }

            this.scene.start("GameScene", { resetSession: true });
        });
    }
}
