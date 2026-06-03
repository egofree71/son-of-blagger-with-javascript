import { GameStates } from "./gameStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { GameController } from "./gameController.js";

type LevelRevealPhase =
    | typeof LevelConstants.DISPLAY_STEP_INITIALIZE
    | typeof LevelConstants.DISPLAY_STEP_REVEAL;

/**
 * Handles the progressive reveal played before each level starts.
 *
 * The original implementation lived in Level.display() and kept its counters
 * directly inside the Level object. This class isolates the small frame-by-
 * frame sequence while preserving the old behaviour:
 *
 * 1. reset all key tiles so they are visible again;
 * 2. cover the camera with two black rectangles;
 * 3. shrink both rectangles until the level is fully visible;
 * 4. hand control back to GameController so monsters can be revealed.
 *
 * The black rectangle graphics are also reused by ScreenManager and
 * EndGameSequence as a simple fixed-camera overlay. Keeping the same graphics
 * objects avoids changing rendering order or Phaser 2 behaviour.
 */
class LevelRevealSequenceController
{
    // Fixed-camera graphics used for the progressive reveal and black overlays.
    upperBlackRectangle: any | null = null;
    lowerBlackRectangle: any | null = null;

    // Current rectangle dimensions during the reveal.
    rectangleHeight: number = 0;
    rectangleWidth: number = 0;

    // Counter used to preserve the original reveal animation speed.
    counter: number = LevelConstants.DISPLAY_REVEAL_INITIAL_COUNTER;

    // Current phase of the reveal sequence.
    phase: LevelRevealPhase = LevelConstants.DISPLAY_STEP_INITIALIZE;

    /**
     * Creates the graphics used to cover/uncover the screen.
     *
     * This must be called once during Phaser create(), before the title screen
     * or level reveal attempts to draw anything.
     */
    createBlackRectangles(): void
    {
        this.upperBlackRectangle = game.add.graphics();
        this.upperBlackRectangle.fixedToCamera = true;

        this.lowerBlackRectangle = game.add.graphics();
        this.lowerBlackRectangle.fixedToCamera = true;
    }

    /**
     * Resets the reveal sequence to the first phase.
     */
    reset(): void
    {
        this.rectangleHeight = 0;
        this.rectangleWidth = 0;
        this.counter = LevelConstants.DISPLAY_REVEAL_INITIAL_COUNTER;
        this.phase = LevelConstants.DISPLAY_STEP_INITIALIZE;
    }

    /**
     * Advances the reveal sequence by one frame.
     */
    update(): void
    {
        switch(this.phase)
        {
            case LevelConstants.DISPLAY_STEP_INITIALIZE:
                this.initializeReveal();
                break;

            case LevelConstants.DISPLAY_STEP_REVEAL:
                this.revealNextFrame();
                break;
        }
    }

    /**
     * Initializes the reveal dimensions and makes key tiles visible again.
     */
    private initializeReveal(): void
    {
        this.rectangleHeight = game.camera.height / 2;
        this.rectangleWidth = game.camera.width;

        // Show again all key tiles. Keys are hidden by setting alpha to 0 when
        // collected, so each level load must restore them before play starts.
        map.forEach(function(tile: any): void
        {
            if (tile.index == LevelConstants.TILE_KEY_INDEX)
                tile.alpha = 1;
        });

        this.phase = LevelConstants.DISPLAY_STEP_REVEAL;
    }

    /**
     * Draws one frame of the shrinking black rectangles.
     */
    private revealNextFrame(): void
    {
        this.counter -= 1;

        this.drawUpperRectangle();
        this.drawLowerRectangle();

        if (this.counter == 0)
        {
            this.counter = LevelConstants.DISPLAY_REVEAL_COUNTER_RESET;
            this.rectangleHeight -= LevelConstants.DISPLAY_REVEAL_HEIGHT_STEP;
        }

        if (this.rectangleHeight <= 0)
            this.finishReveal();
    }

    /**
     * Draws the upper black rectangle over the camera.
     */
    private drawUpperRectangle(): void
    {
        this.upperBlackRectangle.clear();
        this.upperBlackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
        this.upperBlackRectangle.drawRect(0, 0, this.rectangleWidth, this.rectangleHeight);
        this.upperBlackRectangle.endFill();
    }

    /**
     * Draws the lower black rectangle over the camera.
     */
    private drawLowerRectangle(): void
    {
        this.lowerBlackRectangle.clear();
        this.lowerBlackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
        this.lowerBlackRectangle.drawRect(0, game.camera.height - this.rectangleHeight, this.rectangleWidth, this.rectangleHeight);
        this.lowerBlackRectangle.endFill();
    }

    /**
     * Clears the reveal rectangles and starts the monster reveal sequence.
     */
    private finishReveal(): void
    {
        this.upperBlackRectangle.clear();
        this.lowerBlackRectangle.clear();
        this.reset();

        GameController.gameState = GameStates.START_LEVEL;
    }
}

export const LevelRevealSequence = new LevelRevealSequenceController();
