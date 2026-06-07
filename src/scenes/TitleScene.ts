import { Scene } from "phaser";
import { GameSessionState } from "../state/GameSessionState";
import { RetroHudText } from "../ui/RetroHudText";

const FONT_TEXTURE_KEY = "blagger-font";

/**
 * Introduction/title screen for the Phaser 4 port.
 *
 * The original Phaser 2 flow keeps the lower HUD visible under the title logo.
 * This scene therefore owns only the upper gameplay viewport and launches the
 * HUD overlay with a fresh session state until the player starts a real game.
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
        this.add.rectangle(0, 0, 640, 200, 0x000000).setOrigin(0);
        this.add.image(180, 50, "title").setOrigin(0);

        const prompt = new RetroHudText(this, FONT_TEXTURE_KEY, 32, 176, 16, 16, 0xffffff);
        prompt.setText("press any key to start or h for help");

        this.scene.launch("HUDScene", new GameSessionState().toHUDState());

        this.input.keyboard?.once("keydown", (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "h") {
                this.scene.stop("HUDScene");
                this.scene.start("HelpScene");
                return;
            }

            this.scene.stop("HUDScene");
            this.scene.start("GameScene", { resetSession: true });
        });
    }
}
