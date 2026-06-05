import type { GameObjects, Scene, Tilemaps, Types } from "phaser";
import type { TiledObjectLike } from "../tiled/tiledObjects";

/**
 * Direction names used by the temporary Phaser 4 player animation slice.
 *
 * These names are deliberately local to the prototype for now. They can later be
 * merged with the gameplay-level player states when the real movement rules are
 * ported from the Phaser 2 reference implementation.
 */
type FacingDirection = "left" | "right";

/**
 * Minimal Phaser 4 player entity used by the modernization prototype.
 *
 * This class owns the real Blagger sprite and a small horizontal walking test.
 * It is still not final gameplay: there is no tile collision, jumping, falling,
 * ladder logic or interaction handling yet. The current goal is only to validate
 * sprite placement, manual frame selection, direction changes and camera follow
 * before the sensitive Phaser 2 movement rules are ported.
 */
export class Player
{
    /**
     * Tiled stores the player start at the bottom of the original 42px sprite.
     * The Phaser 2 implementation subtracts this value when resetting the player;
     * the prototype keeps the same offset so the sprite appears at the same spot.
     */
    private static readonly TILED_Y_OFFSET = 42;

    /**
     * The Phaser 2 reference advances the walking animation manually with a
     * small counter. In this prototype the counter is tied to accepted pixel
     * movement, not raw update frames, so slowing the temporary movement does not
     * make the legs animate too quickly.
     */
    private static readonly WALK_ANIMATION_FRAME_INTERVAL = 5;

    /**
     * Temporary prototype speed limiter.
     *
     * The real game moves by one pixel per accepted movement frame, but this
     * Phaser 4 slice has no collision, gravity or other gameplay timing yet, so
     * direct one-pixel-per-update movement feels too fast during visual testing.
     * Moving one pixel every two update frames gives a closer prototype feel until
     * the original movement controller is ported properly.
     */
    private static readonly PROTOTYPE_MOVE_FRAME_INTERVAL = 2;

    private static readonly LEFT_FRAMES: readonly number[] = [0, 1, 2, 3, 4, 5];
    private static readonly RIGHT_FRAMES: readonly number[] = [6, 7, 8, 9, 10, 11];

    private readonly sprite: GameObjects.Sprite;
    private facingDirection: FacingDirection = "right";
    private animationFrameIndex = 0;
    private animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
    private movementAccumulator = 1;

    constructor(scene: Scene, textureKey: string)
    {
        this.sprite = scene.add.sprite(0, 0, textureKey, this.firstFrameFor("right"))
            .setOrigin(0, 0)
            .setVisible(false);
    }

    /**
     * Places the player sprite on the current level start object.
     */
    resetToTiledStart(startObject: TiledObjectLike): void
    {
        this.sprite.setPosition(
            startObject.x,
            startObject.y - Player.TILED_Y_OFFSET
        );

        this.facingDirection = "right";
        this.animationFrameIndex = 0;
        this.animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
        this.movementAccumulator = 1;
        this.sprite.setFrame(this.firstFrameFor(this.facingDirection));
        this.sprite.setVisible(true);
    }

    /**
     * Runs the temporary left/right walking slice for one frame.
     *
     * This method intentionally keeps the player animation manual instead of
     * using Phaser's timed animation playback. The Phaser 2 reference advances
     * walking frames through counters, and preserving that idea avoids idle-frame
     * resets and accidental moonwalk-style direction bugs during the prototype.
     */
    updatePrototypeWalk(cursors: Types.Input.Keyboard.CursorKeys, map: Tilemaps.Tilemap): void
    {
        const requestedDirection = this.readHorizontalDirection(cursors);

        if (!requestedDirection) {
            this.stopPrototypeWalk();
            return;
        }

        this.applyDirectionChange(requestedDirection);

        const moved = this.moveHorizontallyWhenDue(requestedDirection, map);

        if (moved) {
            this.advanceWalkingFrameWhenDue();
        }
    }

    /**
     * Returns the visual center of the sprite for camera placement.
     */
    getCenter(): { x: number; y: number }
    {
        return {
            x: this.sprite.x + this.sprite.displayWidth / 2,
            y: this.sprite.y + this.sprite.displayHeight / 2
        };
    }

    /**
     * Exposes the Phaser sprite only for scene-level camera/debug helpers.
     * Gameplay code should grow behaviour-focused methods before it manipulates
     * the player directly.
     */
    getSprite(): GameObjects.Sprite
    {
        return this.sprite;
    }

    private readHorizontalDirection(cursors: Types.Input.Keyboard.CursorKeys): FacingDirection | null
    {
        if (cursors.left?.isDown) {
            return "left";
        }

        if (cursors.right?.isDown) {
            return "right";
        }

        return null;
    }

    private applyDirectionChange(direction: FacingDirection): void
    {
        if (this.facingDirection === direction) {
            return;
        }

        this.facingDirection = direction;
        this.animationFrameIndex = 0;
        this.animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
        this.sprite.setFrame(this.firstFrameFor(direction));
    }

    private moveHorizontallyWhenDue(direction: FacingDirection, map: Tilemaps.Tilemap): boolean
    {
        this.movementAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.movementAccumulator < 1) {
            return false;
        }

        this.movementAccumulator -= 1;

        const deltaX = direction === "right" ? 1 : -1;
        const maxX = Math.max(0, map.widthInPixels - this.sprite.displayWidth);
        const nextX = this.clamp(this.sprite.x + deltaX, 0, maxX);

        if (nextX === this.sprite.x) {
            return false;
        }

        // Keep the temporary no-collision movement inside the imported map.
        // This will be replaced by tile probes when the real movement is ported.
        this.sprite.x = nextX;
        return true;
    }

    private advanceWalkingFrameWhenDue(): void
    {
        this.animationFrameCounter -= 1;

        if (this.animationFrameCounter > 0) {
            return;
        }

        this.animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
        this.animationFrameIndex = (this.animationFrameIndex + 1) % this.framesFor(this.facingDirection).length;
        this.sprite.setFrame(this.framesFor(this.facingDirection)[this.animationFrameIndex]);
    }

    private stopPrototypeWalk(): void
    {
        this.movementAccumulator = 1;

        // Do not reset to an idle frame here. The Phaser 2 version simply stops
        // the current animation, so the player keeps the last walking frame.
    }

    private firstFrameFor(direction: FacingDirection): number
    {
        return this.framesFor(direction)[0];
    }

    private framesFor(direction: FacingDirection): readonly number[]
    {
        return direction === "right"
            ? Player.RIGHT_FRAMES
            : Player.LEFT_FRAMES;
    }

    private clamp(value: number, min: number, max: number): number
    {
        return Math.min(Math.max(value, min), max);
    }
}
