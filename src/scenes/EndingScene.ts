import { Scene } from "phaser";
import { RetroHudText } from "../ui/RetroHudText";
import {
    ENDING_MESSAGE_INITIAL_SCALE,
    ENDING_MESSAGE_MAX_SCALE,
    ENDING_MESSAGE_SCALE_INCREMENT_PER_STEP,
    ENDING_WAIT_STEPS,
    SEQUENCE_LOGICAL_STEP_MS
} from "../config/SequenceTiming";

const FONT_TEXTURE_KEY = "blagger-font";
const END_GAME_MESSAGE_TEXT = "Congratulations !\n      you\nfinished the game";
const CHARACTER_SPACING = 1;
const LINE_SPACING = 18;

type EndingPhase = "scale-message" | "wait-then-title";

/**
 * Final congratulations screen shown after the last level has been completed.
 *
 * The message uses the same bitmap font as the HUD, with extra character and
 * line spacing so the three scaled lines remain readable while they grow.
 */
export class EndingScene extends Scene
{
    private message?: RetroHudText;
    private phase: EndingPhase = "scale-message";
    private messageScale = ENDING_MESSAGE_INITIAL_SCALE;
    private waitCounter = ENDING_WAIT_STEPS;
    private sequenceStepAccumulatorMs = 0;

    constructor()
    {
        super("EndingScene");
    }

    create(): void
    {
        this.cameras.main.setBackgroundColor(0x000000);
        this.usePixelatedCanvasWhileActive();
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
        this.sequenceStepAccumulatorMs += deltaMs;

        while (this.sequenceStepAccumulatorMs >= SEQUENCE_LOGICAL_STEP_MS) {
            this.sequenceStepAccumulatorMs -= SEQUENCE_LOGICAL_STEP_MS;
            this.updateOneSequenceStep();
        }
    }

    private usePixelatedCanvasWhileActive(): void
    {
        const canvasStyle = this.game.canvas.style;
        const previousImageRendering = canvasStyle.imageRendering;

        // The final message is a full-screen bitmap-font effect. Keeping only
        // this scene pixelated avoids blurring the scaled letters without
        // changing the smoother in-game rendering used by the map.
        canvasStyle.imageRendering = "pixelated";

        this.events.once("shutdown", () => {
            canvasStyle.imageRendering = previousImageRendering;
        });
    }

    private updateOneSequenceStep(): void
    {
        if (this.phase === "scale-message") {
            this.messageScale += ENDING_MESSAGE_SCALE_INCREMENT_PER_STEP;
            this.message?.setScale(this.messageScale);

            if (this.messageScale > ENDING_MESSAGE_MAX_SCALE) {
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
