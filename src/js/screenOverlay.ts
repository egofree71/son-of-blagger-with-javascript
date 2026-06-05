import { LevelConstants } from "./levelConstants.ts";

/**
 * Owns the fixed-camera black overlay graphics shared by screen and sequence code.
 *
 * LevelRevealSequence uses both rectangles for the level reveal animation.
 * ScreenManager and EndGameSequence use the upper rectangle as a full-screen
 * black background. Keeping those graphics in a small dedicated object avoids
 * making unrelated visual components depend on LevelRevealSequence just to reuse
 * its Phaser graphics objects.
 */
export class ScreenOverlayController
{
    private upperBlackRectangle: any | null = null;
    private lowerBlackRectangle: any | null = null;

    /**
     * Creates the graphics used by full-screen overlays and the level reveal.
     */
    public createBlackRectangles(): void
    {
        this.upperBlackRectangle = game.add.graphics();
        this.upperBlackRectangle.fixedToCamera = true;

        this.lowerBlackRectangle = game.add.graphics();
        this.lowerBlackRectangle.fixedToCamera = true;
    }

    /**
     * Draws the upper overlay rectangle.
     */
    public drawUpperRectangle(x: number, y: number, width: number, height: number): void
    {
        this.requireUpperRectangle().clear();
        this.requireUpperRectangle().beginFill(LevelConstants.BLACK_COLOR, 1);
        this.requireUpperRectangle().drawRect(x, y, width, height);
        this.requireUpperRectangle().endFill();
    }

    /**
     * Draws the lower overlay rectangle.
     */
    public drawLowerRectangle(x: number, y: number, width: number, height: number): void
    {
        this.requireLowerRectangle().clear();
        this.requireLowerRectangle().beginFill(LevelConstants.BLACK_COLOR, 1);
        this.requireLowerRectangle().drawRect(x, y, width, height);
        this.requireLowerRectangle().endFill();
    }

    /**
     * Draws a full-screen black overlay using the upper rectangle.
     */
    public drawFullScreen(): void
    {
        this.drawUpperRectangle(0, 0, game.stage.width, game.stage.height);
    }

    /**
     * Draws a full-camera black overlay using the upper rectangle.
     */
    public drawFullCamera(): void
    {
        this.drawUpperRectangle(0, 0, game.camera.width, game.camera.height);
    }

    /**
     * Clears the upper overlay rectangle.
     */
    public clearUpperRectangle(): void
    {
        this.requireUpperRectangle().clear();
    }

    /**
     * Clears the lower overlay rectangle.
     */
    public clearLowerRectangle(): void
    {
        this.requireLowerRectangle().clear();
    }

    /**
     * Clears both overlay rectangles.
     */
    public clearAll(): void
    {
        this.clearUpperRectangle();
        this.clearLowerRectangle();
    }

    private requireUpperRectangle(): any
    {
        if (!this.upperBlackRectangle)
            throw new Error("ScreenOverlay.createBlackRectangles() must be called before drawing the upper overlay.");

        return this.upperBlackRectangle;
    }

    private requireLowerRectangle(): any
    {
        if (!this.lowerBlackRectangle)
            throw new Error("ScreenOverlay.createBlackRectangles() must be called before drawing the lower overlay.");

        return this.lowerBlackRectangle;
    }
}

