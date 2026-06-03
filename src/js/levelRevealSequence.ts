import { LevelConstants } from "./levelConstants.ts";
import { ScreenOverlay } from "./screenOverlay.ts";

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
 * 4. report completion so the caller can start the monster reveal.
 *
 * The black rectangle graphics are owned by ScreenOverlay and reused by other
 * screens as simple fixed-camera overlays. This sequence only controls the
 * reveal animation itself.
 */
class LevelRevealSequenceController
{
    // Current rectangle dimensions during the reveal.
    private rectangleHeight: number = 0;
    private rectangleWidth: number = 0;

    // Counter used to preserve the original reveal animation speed.
    private counter: number = LevelConstants.DISPLAY_REVEAL_INITIAL_COUNTER;

    // Current phase of the reveal sequence.
    private phase: LevelRevealPhase = LevelConstants.DISPLAY_STEP_INITIALIZE;

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
    update(): boolean
    {
        switch(this.phase)
        {
            case LevelConstants.DISPLAY_STEP_INITIALIZE:
                this.initializeReveal();
                return false;

            case LevelConstants.DISPLAY_STEP_REVEAL:
                return this.revealNextFrame();
        }

        return false;
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
    private revealNextFrame(): boolean
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
            return this.finishReveal();

        return false;
    }

    /**
     * Draws the upper black rectangle over the camera.
     */
    private drawUpperRectangle(): void
    {
        ScreenOverlay.drawUpperRectangle(0, 0, this.rectangleWidth, this.rectangleHeight);
    }

    /**
     * Draws the lower black rectangle over the camera.
     */
    private drawLowerRectangle(): void
    {
        ScreenOverlay.drawLowerRectangle(0, game.camera.height - this.rectangleHeight, this.rectangleWidth, this.rectangleHeight);
    }

    /**
     * Clears the reveal rectangles and reports that the sequence has finished.
     */
    private finishReveal(): boolean
    {
        ScreenOverlay.clearAll();
        this.reset();
        return true;
    }
}

export const LevelRevealSequence = new LevelRevealSequenceController();
