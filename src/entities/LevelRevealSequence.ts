import type { GameObjects, Scene } from "phaser";

/**
 * Plays the original level-start reveal over the gameplay viewport.
 *
 * The Phaser 2 version covered the camera with two black rectangles, then
 * shrank them from the center until the level was fully visible. The Phaser 4
 * port keeps that visual as an update-driven sequence owned by GameScene. HUD
 * rendering is intentionally left alone because the HUD lives in its own lower
 * scene and should already be visible before the level opens.
 */
export class LevelRevealSequence
{
    private static readonly BLACK_COLOR = 0x000000;
    private static readonly REFERENCE_FPS = 60;
    private static readonly COUNTER_RESET_FRAMES = 2;
    private static readonly HEIGHT_STEP = 2;
    private static readonly OVERLAY_DEPTH = 100;
    private static readonly STEP_INTERVAL_MS = LevelRevealSequence.COUNTER_RESET_FRAMES * 1000 / LevelRevealSequence.REFERENCE_FPS;

    private readonly scene: Scene;
    private readonly viewportWidth: number;
    private readonly viewportHeight: number;
    private upperRectangle?: GameObjects.Rectangle;
    private lowerRectangle?: GameObjects.Rectangle;
    private rectangleHeight = 0;
    private elapsedStepTimeMs = 0;
    private playing = false;
    private onComplete?: () => void;

    constructor(scene: Scene, viewportWidth: number, viewportHeight: number)
    {
        this.scene = scene;
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
    }

    /**
     * Starts the reveal and covers the whole gameplay viewport immediately.
     */
    start(onComplete: () => void): void
    {
        this.stop();
        this.onComplete = onComplete;
        this.rectangleHeight = this.viewportHeight / 2;
        this.elapsedStepTimeMs = 0;
        this.playing = true;
        this.createRectanglesIfNeeded();
        this.drawRectangles();
    }

    /**
     * Advances the shrinking mask using a refresh-rate independent timer.
     */
    update(deltaMs: number): void
    {
        if (!this.playing) {
            return;
        }

        this.elapsedStepTimeMs += deltaMs;

        while (this.elapsedStepTimeMs >= LevelRevealSequence.STEP_INTERVAL_MS) {
            this.elapsedStepTimeMs -= LevelRevealSequence.STEP_INTERVAL_MS;
            this.rectangleHeight -= LevelRevealSequence.HEIGHT_STEP;

            if (this.rectangleHeight <= 0) {
                this.finish();
                return;
            }
        }

        this.drawRectangles();
    }

    /**
     * Stops the sequence and removes the black mask rectangles.
     */
    stop(): void
    {
        this.playing = false;
        this.elapsedStepTimeMs = 0;
        this.rectangleHeight = 0;
        this.destroyRectangles();
    }

    /**
     * Reports whether gameplay is currently blocked by the reveal.
     */
    isPlaying(): boolean
    {
        return this.playing;
    }

    private createRectanglesIfNeeded(): void
    {
        this.upperRectangle = this.scene.add.rectangle(0, 0, this.viewportWidth, this.rectangleHeight, LevelRevealSequence.BLACK_COLOR)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(LevelRevealSequence.OVERLAY_DEPTH);

        this.lowerRectangle = this.scene.add.rectangle(0, this.viewportHeight - this.rectangleHeight, this.viewportWidth, this.rectangleHeight, LevelRevealSequence.BLACK_COLOR)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(LevelRevealSequence.OVERLAY_DEPTH);
    }

    private drawRectangles(): void
    {
        this.upperRectangle?.setSize(this.viewportWidth, this.rectangleHeight);
        this.lowerRectangle?.setPosition(0, this.viewportHeight - this.rectangleHeight);
        this.lowerRectangle?.setSize(this.viewportWidth, this.rectangleHeight);
    }

    private finish(): void
    {
        const completeCallback = this.onComplete;

        this.stop();
        this.onComplete = undefined;
        completeCallback?.();
    }

    private destroyRectangles(): void
    {
        this.upperRectangle?.destroy();
        this.lowerRectangle?.destroy();
        this.upperRectangle = undefined;
        this.lowerRectangle = undefined;
    }
}
