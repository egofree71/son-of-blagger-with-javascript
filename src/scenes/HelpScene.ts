import { Scene } from "phaser";
import { RetroHudText } from "../ui/RetroHudText";

const FONT_TEXTURE_KEY = "blagger-font";

const HELP_TEXT = "Players control Slippery Sid, who is an\n" +
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
    "\n" +
    "Controls : left and right arrows \n" +
    "to go left and right and space bar \n" +
    "to jump.";

/**
 * Help screen shown from the title screen when the player presses H.
 *
 * This intentionally keeps the original short instruction text. Pressing any
 * key returns to the title screen, matching the Phaser 2 screen manager flow.
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
        this.add.rectangle(0, 0, 640, 400, 0x000000).setOrigin(0);

        const helpText = new RetroHudText(this, FONT_TEXTURE_KEY, 10, 10, 16, 16, 0xc0c0c0);
        helpText.setText(HELP_TEXT);

        this.input.keyboard?.once("keydown", () => {
            this.scene.start("TitleScene");
        });
    }
}
