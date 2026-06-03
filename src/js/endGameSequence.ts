import { LevelConstants } from "./levelConstants.ts";
import { LevelRevealSequence } from "./levelRevealSequence.ts";
import { HUD } from "./HUD.ts";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";

type EndGamePhase =
    | typeof LevelConstants.END_GAME_STEP_CONVERT_AIR
    | typeof LevelConstants.END_GAME_STEP_SHOW_MESSAGE
    | typeof LevelConstants.END_GAME_STEP_SCALE_MESSAGE
    | typeof LevelConstants.END_GAME_STEP_WAIT_THEN_RESET;

/**
 * Handles the final sequence played after the last level has been completed.
 *
 * This logic used to live in Level.endGame(). It is now isolated for the same
 * reason as LevelTransition: the sequence is a small frame-by-frame state
 * machine, and keeping it outside Level makes the level object easier to read.
 *
 * The behaviour, scoring values and timings are intentionally preserved.
 */
class EndGameSequenceController
{
    // Current phase of the final sequence.
    phase: EndGamePhase = LevelConstants.END_GAME_STEP_CONVERT_AIR;

    // Image containing the congratulations message.
    congratulationsImage: any | null = null;

    // Generic frame counter used by the final wait phase.
    counter = 0;

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
    update(): void
    {
        switch(this.phase)
        {
            case LevelConstants.END_GAME_STEP_CONVERT_AIR:
                this.convertAirToScore();
                break;

            case LevelConstants.END_GAME_STEP_SHOW_MESSAGE:
                this.showCongratulationsMessage();
                break;

            case LevelConstants.END_GAME_STEP_SCALE_MESSAGE:
                this.scaleCongratulationsMessage();
                break;

            case LevelConstants.END_GAME_STEP_WAIT_THEN_RESET:
                this.waitThenReturnToIntroduction();
                break;
        }
    }

    /**
     * Converts the remaining air into score before displaying the final message.
     */
    private convertAirToScore(): void
    {
        if (Level.airLevel > 0)
        {
            Level.decreaseAir(LevelConstants.END_GAME_AIR_DECREMENT);
            GameController.addScore(LevelConstants.END_GAME_SCORE_INCREMENT);
            HUD.displayScore();
            HUD.displayAirLevel();
        }
        else
        {
            HUD.clearAirLevel();
            Level.resetAirLevel();
            this.phase = LevelConstants.END_GAME_STEP_SHOW_MESSAGE;
        }
    }

    /**
     * Displays the congratulations message on a black background.
     */
    private showCongratulationsMessage(): void
    {
        this.phase = LevelConstants.END_GAME_STEP_SCALE_MESSAGE;

        // Draw a black rectangle.
        LevelRevealSequence.upperBlackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
        LevelRevealSequence.upperBlackRectangle.drawRect(0, 0, game.stage.width, game.stage.height);

        var font = game.add.retroFont(LevelConstants.FONT_BLAGGER, 16, 16, Phaser.RetroFont.TEXT_SET2);
        font.setText (LevelConstants.END_GAME_MESSAGE_TEXT, true, 1 ,18);

        this.congratulationsImage = game.add.image(LevelConstants.END_GAME_MESSAGE_X, LevelConstants.END_GAME_MESSAGE_Y, font);
        this.congratulationsImage.tint = LevelConstants.WHITE_COLOR;
        this.congratulationsImage.fixedToCamera = true;

        // Scale down the message before it grows on screen.
        this.congratulationsImage.scale.x = LevelConstants.END_GAME_INITIAL_SCALE;
        this.congratulationsImage.scale.y = LevelConstants.END_GAME_INITIAL_SCALE;

        this.counter = LevelConstants.END_GAME_MESSAGE_WAIT_COUNTER;
    }

    /**
     * Scales the congratulations message up until it reaches its preserved size.
     */
    private scaleCongratulationsMessage(): void
    {
        this.congratulationsImage.scale.x += LevelConstants.END_GAME_SCALE_INCREMENT;
        this.congratulationsImage.scale.y += LevelConstants.END_GAME_SCALE_INCREMENT;

        if (this.congratulationsImage.scale.x > LevelConstants.END_GAME_MAX_SCALE)
            this.phase = LevelConstants.END_GAME_STEP_WAIT_THEN_RESET;
    }

    /**
     * Waits briefly, clears the message, resets the game and returns to the title screen.
     */
    private waitThenReturnToIntroduction(): void
    {
        this.counter--;

        if (this.counter == 0)
        {
            LevelRevealSequence.upperBlackRectangle.clear();

            if (this.congratulationsImage)
                this.congratulationsImage.destroy();

            GameController.updateHiScoreIfNeeded();
            GameController.resetScoreAndLives();
            Level.resetGame();
            HUD.displayAirLevel();
            GameController.loadIntroduction();
        }
    }
}

export const EndGameSequence = new EndGameSequenceController();
