import { LevelConstants } from "./levelConstants.ts";
import { ScreenOverlay } from "./screenOverlay.ts";

type EndGamePhase =
    | typeof LevelConstants.END_GAME_STEP_CONVERT_AIR
    | typeof LevelConstants.END_GAME_STEP_SHOW_MESSAGE
    | typeof LevelConstants.END_GAME_STEP_SCALE_MESSAGE
    | typeof LevelConstants.END_GAME_STEP_WAIT_THEN_RESET;

export interface EndGameSequenceResult
{
    /** Score points earned during this frame, usually while converting air. */
    scoreDelta: number;

    /** Air amount to remove from the current level during this frame. */
    airDecreaseAmount: number;

    /** True when the visible air bar should be redrawn from Level.airLevel. */
    airChanged: boolean;

    /** True when the air bar should be cleared visually. */
    airCleared: boolean;

    /** True when the level air value should be reset after conversion finishes. */
    airResetRequired: boolean;

    /** True when the final sequence has completed and the game should return to the title screen. */
    finished: boolean;
}

/**
 * Handles the final visual sequence played after the last level has been completed.
 *
 * The sequence no longer updates score, HUD, Level or GameController directly.
 * It reports what happened during the current frame through EndGameSequenceResult,
 * and GameController applies the corresponding gameplay/runtime consequences.
 */
export class EndGameSequenceController
{
    // Current phase of the final sequence.
    private phase: EndGamePhase = LevelConstants.END_GAME_STEP_CONVERT_AIR;

    // Image containing the congratulations message.
    private congratulationsImage: any | null = null;

    // Generic frame counter used by the final wait phase.
    private counter = 0;

    /**
     * Resets the sequence to its initial state.
     */
    reset(): void
    {
        this.phase = LevelConstants.END_GAME_STEP_CONVERT_AIR;
        this.congratulationsImage = null;
        this.counter = 0;
    }

    /**
     * Advances the final sequence by one frame.
     */
    update(remainingAirLevel: number): EndGameSequenceResult
    {
        switch(this.phase)
        {
            case LevelConstants.END_GAME_STEP_CONVERT_AIR:
                return this.convertAirToScore(remainingAirLevel);

            case LevelConstants.END_GAME_STEP_SHOW_MESSAGE:
                return this.showCongratulationsMessage();

            case LevelConstants.END_GAME_STEP_SCALE_MESSAGE:
                return this.scaleCongratulationsMessage();

            case LevelConstants.END_GAME_STEP_WAIT_THEN_RESET:
                return this.waitThenReturnToIntroduction();
        }
    }

    /**
     * Converts the remaining air into score before displaying the final message.
     */
    private convertAirToScore(remainingAirLevel: number): EndGameSequenceResult
    {
        const result = this.createResult();

        if (remainingAirLevel > 0)
        {
            result.airDecreaseAmount = LevelConstants.END_GAME_AIR_DECREMENT;
            result.scoreDelta = LevelConstants.END_GAME_SCORE_INCREMENT;
            result.airChanged = true;
        }
        else
        {
            result.airCleared = true;
            result.airResetRequired = true;
            this.phase = LevelConstants.END_GAME_STEP_SHOW_MESSAGE;
        }

        return result;
    }

    /**
     * Displays the congratulations message on a black background.
     */
    private showCongratulationsMessage(): EndGameSequenceResult
    {
        this.phase = LevelConstants.END_GAME_STEP_SCALE_MESSAGE;

        // Draw a black rectangle.
        ScreenOverlay.drawFullScreen();

        var font = game.add.retroFont(LevelConstants.FONT_BLAGGER, 16, 16, Phaser.RetroFont.TEXT_SET2);
        font.setText (LevelConstants.END_GAME_MESSAGE_TEXT, true, 1 ,18);

        this.congratulationsImage = game.add.image(LevelConstants.END_GAME_MESSAGE_X, LevelConstants.END_GAME_MESSAGE_Y, font);
        this.congratulationsImage.tint = LevelConstants.WHITE_COLOR;
        this.congratulationsImage.fixedToCamera = true;

        // Scale down the message before it grows on screen.
        this.congratulationsImage.scale.x = LevelConstants.END_GAME_INITIAL_SCALE;
        this.congratulationsImage.scale.y = LevelConstants.END_GAME_INITIAL_SCALE;

        this.counter = LevelConstants.END_GAME_MESSAGE_WAIT_COUNTER;

        return this.createResult();
    }

    /**
     * Scales the congratulations message up until it reaches its preserved size.
     */
    private scaleCongratulationsMessage(): EndGameSequenceResult
    {
        this.congratulationsImage.scale.x += LevelConstants.END_GAME_SCALE_INCREMENT;
        this.congratulationsImage.scale.y += LevelConstants.END_GAME_SCALE_INCREMENT;

        if (this.congratulationsImage.scale.x > LevelConstants.END_GAME_MAX_SCALE)
            this.phase = LevelConstants.END_GAME_STEP_WAIT_THEN_RESET;

        return this.createResult();
    }

    /**
     * Waits briefly, clears the message, and reports that the final sequence is done.
     */
    private waitThenReturnToIntroduction(): EndGameSequenceResult
    {
        const result = this.createResult();

        this.counter--;

        if (this.counter == 0)
        {
            ScreenOverlay.clearUpperRectangle();

            if (this.congratulationsImage)
                this.congratulationsImage.destroy();

            result.finished = true;
        }

        return result;
    }

    /**
     * Creates a neutral result for one sequence frame.
     */
    private createResult(): EndGameSequenceResult
    {
        return {
            scoreDelta: 0,
            airDecreaseAmount: 0,
            airChanged: false,
            airCleared: false,
            airResetRequired: false,
            finished: false
        };
    }
}

export const EndGameSequence = new EndGameSequenceController();
