import { Scene } from "phaser";
import { isTouchModeEnabled } from "../config/RuntimeMode";
import { TOUCH_HELP_REQUESTED_EVENT } from "../input/PlayerInputState";
import { GameSessionState } from "../state/GameSessionState";
import { RetroHudText } from "../ui/RetroHudText";

const FONT_TEXTURE_KEY = "blagger-font";

/**
 * Introduction/title screen.
 *
 * The title scene owns the upper gameplay viewport and launches the HUD overlay
 * with a fresh session state until the player starts a real game. In touch mode,
 * the lower HUD can request help/fullscreen while any other tap starts the game.
 */
export class TitleScene extends Scene
{
    private touchModeEnabled = false;

    constructor()
    {
        super("TitleScene");
    }

    create(): void
    {
        this.touchModeEnabled = isTouchModeEnabled();
        this.cameras.main.setBackgroundColor(0x000000);
        this.add.rectangle(0, 0, 640, 200, 0x000000).setOrigin(0);
        this.add.image(180, 50, "title").setOrigin(0);

        const prompt = new RetroHudText(this, FONT_TEXTURE_KEY, this.titlePromptX, 176, 16, 16, 0xffffff);
        prompt.setText(this.touchModeEnabled ? "tap screen to start" : "press any key to start or h for help");

        this.scene.launch("HUDScene", {
            touchModeEnabled: this.touchModeEnabled,
            showTouchIntroActions: this.touchModeEnabled,
            ...new GameSessionState().toHUDState()
        });

        this.input.keyboard?.once("keydown", (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === "h") {
                this.showHelp();
                return;
            }

            this.startGame();
        });

        if (this.touchModeEnabled) {
            this.input.on("pointerdown", this.handleTouchStartPointer, this);
            this.game.events.on(TOUCH_HELP_REQUESTED_EVENT, this.showHelp, this);
            this.events.once("shutdown", () => this.removeTouchHelpListener());
            this.events.once("destroy", () => this.removeTouchHelpListener());
        }
    }

    private handleTouchStartPointer(): void
    {
        // Touch action buttons stop propagation, so any remaining tap can start.
        this.startGame();
    }

    private get titlePromptX(): number
    {
        const promptText = this.touchModeEnabled ? "tap screen to start" : "press any key to start or h for help";
        return Math.round((640 - promptText.length * 16) / 2);
    }

    private startGame(): void
    {
        this.removeTouchHelpListener();
        this.input.off("pointerdown", this.handleTouchStartPointer, this);
        this.scene.stop("HUDScene");
        this.scene.start("GameScene", { resetSession: true });
    }

    private showHelp(): void
    {
        this.removeTouchHelpListener();
        this.input.off("pointerdown", this.handleTouchStartPointer, this);
        this.scene.stop("HUDScene");
        this.scene.start("HelpScene");
    }

    private removeTouchHelpListener(): void
    {
        this.input.off("pointerdown", this.handleTouchStartPointer, this);
        this.game.events.off(TOUCH_HELP_REQUESTED_EVENT, this.showHelp, this);
    }
}
