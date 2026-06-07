import { Scene } from "phaser";
import { RetroHudText } from "../ui/RetroHudText";

const FONT_TEXTURE_KEY = "blagger-font";
const END_GAME_MESSAGE_TEXT = "Congratulations !\n      you\nfinished the game";
const INITIAL_SCALE = 0.1;
const SCALE_INCREMENT = 0.005;
const MAX_SCALE = 1.8;
const WAIT_COUNTER = 220;
const REFERENCE_FPS = 60;
const LOGICAL_FRAME_MS = 1000 / REFERENCE_FPS;
const CHARACTER_SPACING = 1;
const LINE_SPACING = 18;

type EndingPhase = "scale-message" | "wait-then-title";

/**
 * Final congratulations screen shown after the last level has been completed.
 *
 * The text is rendered with the same extra character and line spacing used by
 * the Phaser 2 RetroFont call. Without that spacing, the three scaled lines sit
 * too close together and the final message loses the chunky C64 look.
 */
export class EndingScene extends Scene
{
    private message?: RetroHudText;
    private phase: EndingPhase = "scale-message";
    private messageScale = INITIAL_SCALE;
    private waitCounter = WAIT_COUNTER;
    private frameAccumulatorMs = 0;

    constructor()
    {
        super("EndingScene");
    }

    create(): void
    {
        this.cameras.main.setBackgroundColor(0x000000);
        this.add.rectangle(0, 0, 640, 400, 0x000000).setOrigin(0).setDepth(1000);

        this.message = new RetroHudText(
            this,
            FONT_TEXTURE_KEY,
            60,
            100,
            16,
            16,
            0xffffff,
            CHARACTER_SPACING,
            LINE_SPACING
        );
        this.message.setText(END_GAME_MESSAGE_TEXT);
        this.message.setScale(this.messageScale);
        this.message.setDepth(1001);
    }

    update(_time: number, deltaMs: number): void
    {
        this.frameAccumulatorMs += deltaMs;

        while (this.frameAccumulatorMs >= LOGICAL_FRAME_MS) {
            this.frameAccumulatorMs -= LOGICAL_FRAME_MS;
            this.updateOneLogicalFrame();
        }
    }

    private updateOneLogicalFrame(): void
    {
        if (this.phase === "scale-message") {
            this.messageScale += SCALE_INCREMENT;
            this.message?.setScale(this.messageScale);

            if (this.messageScale > MAX_SCALE) {
                this.phase = "wait-then-title";
            }

            return;
        }

        this.waitCounter -= 1;

        if (this.waitCounter > 0) {
            return;
        }

        this.scene.stop("HUDScene");
        this.scene.stop("GameScene");
        this.scene.start("TitleScene");
    }
}
