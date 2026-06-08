import { Scene } from "phaser";
import { isTouchModeEnabled } from "../config/RuntimeMode";
import { RetroHudText } from "../ui/RetroHudText";

const FONT_TEXTURE_KEY = "blagger-font";

const BASE_HELP_TEXT = "Players control Slippery Sid, who is an\n" +
    "espionage agent and son of blagger.\n" +
    "Like the first game, the task is to \n" +
    "collect a series of keys scattered \n" +
    "around the level. Sid must navigate \n" +
    "a series of platforms while jumping \n" +
    "over robots that guard the keys. Once \n" +
    "Sid collects all the keys, he can make\n" +
    "his way to the next level by going\n" +
    "through a doorway. Like his father, Sid\n" +
    "has a limited time to perform this task,\n" +
    "and he loses one of his lives if he\n" +
    "falls long distances.\n" +
    "\n";

const KEYBOARD_HELP_TEXT = BASE_HELP_TEXT +
    "Controls : left and right arrows \n" +
    "to go left and right and space bar \n" +
    "to jump.";

const TOUCH_HELP_TEXT = BASE_HELP_TEXT +
    "Touch controls : left and right \n" +
    "buttons to move, up button to jump.\n" +
    "Tap this screen to return.";

/**
 * Help screen shown from the title screen when the player presses H.
 *
 * The page uses the retro bitmap font for the short instruction text. Pressing
 * any key returns to the title screen; in touch mode a tap does the same.
 */
export class HelpScene extends Scene
{
    constructor()
    {
        super("HelpScene");
    }

    create(): void
    {
        this.cameras.main.setBackgroundColor(0x000000);
        this.usePixelatedCanvasWhileActive();
        this.add.rectangle(0, 0, 640, 400, 0x000000).setOrigin(0);

        // Extra line spacing is important here; without it the large bitmap
        // letters overlap and the help page looks crushed.
        const helpText = new RetroHudText(this, FONT_TEXTURE_KEY, 10, 10, 16, 16, 0xc0c0c0, 0, 6);
        helpText.setText(isTouchModeEnabled() ? TOUCH_HELP_TEXT : KEYBOARD_HELP_TEXT);

        this.input.keyboard?.once("keydown", () => {
            this.scene.start("TitleScene");
        });

        if (isTouchModeEnabled()) {
            this.input.once("pointerdown", () => {
                this.scene.start("TitleScene");
            });
        }
    }

    private usePixelatedCanvasWhileActive(): void
    {
        const canvasStyle = this.game.canvas.style;
        const previousImageRendering = canvasStyle.imageRendering;

        // The gameplay canvas stays smoothed, but this full-screen text page is
        // closer to the C64 reference when the browser does not blur the pixels.
        canvasStyle.imageRendering = "pixelated";

        this.events.once("shutdown", () => {
            canvasStyle.imageRendering = previousImageRendering;
        });
    }
}
