import type { GameObjects, Scene, Tilemaps, Types } from "phaser";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import type { TileCollisionProbe } from "../tiled/tileCollisionProbe";

/**
 * Direction names used by the temporary Phaser 4 player movement slice.
 *
 * These names are deliberately local to the prototype for now. They can later be
 * merged with the gameplay-level player states when the real movement rules are
 * ported from the Phaser 2 reference implementation.
 */
type FacingDirection = "left" | "right";

/**
 * Minimal Phaser 4 player entity used by the modernization prototype.
 *
 * This class owns the real Blagger sprite and a small movement test. It is still
 * not final gameplay: only horizontal walking, side wall blocking and simple
 * falling have been ported. Jumping, ladder logic, slides, conveyors and
 * interaction handling are still absent. The current goal is to validate the
 * first manual tile probes before the sensitive Phaser 2 movement rules are
 * moved over more fully.
 */
export class Player
{
    // Tiled stores the player start at the bottom of the original 42px sprite.
    private static readonly TILED_Y_OFFSET = 42;

    // Advance the walking frame only after a few accepted pixel moves.
    private static readonly WALK_ANIMATION_FRAME_INTERVAL = 5;

    // Horizontal foot probes copied from the Phaser 2 movement controller.
    private static readonly FOOT_LEFT_OFFSET = 7;
    private static readonly FOOT_RIGHT_OFFSET = 23;

    // Side wall probes copied from the Phaser 2 movement controller.
    private static readonly RIGHT_WALL_X_OFFSET = 24;
    private static readonly LEFT_WALL_X_OFFSET = 5;
    private static readonly SIDE_WALL_TOP_OFFSET = 6;
    private static readonly SIDE_WALL_BOTTOM_OFFSET = 1;

    // Temporary prototype speed limiter. The real movement timing will be
    // revisited when the full Phaser 2 movement controller is ported.
    private static readonly PROTOTYPE_MOVE_FRAME_INTERVAL = 2;

    private static readonly LEFT_FRAMES: readonly number[] = [0, 1, 2, 3, 4, 5];
    private static readonly RIGHT_FRAMES: readonly number[] = [6, 7, 8, 9, 10, 11];

    private readonly sprite: GameObjects.Sprite;
    private facingDirection: FacingDirection = "right";
    private animationFrameIndex = 0;
    private animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
    private horizontalMovementAccumulator = 1;
    private verticalMovementAccumulator = 1;

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
        this.horizontalMovementAccumulator = 1;
        this.verticalMovementAccumulator = 1;
        this.sprite.setFrame(this.firstFrameFor(this.facingDirection));
        this.sprite.setVisible(true);
    }

    /**
     * Runs the temporary walking/falling movement slice for one frame.
     *
     * This method intentionally keeps movement manual instead of using Arcade
     * Physics. The Phaser 2 reference moves through one-pixel decisions based on
     * tile probes, and preserving that idea makes later comparison much easier.
     */
    updatePrototypeMovement(
        cursors: Types.Input.Keyboard.CursorKeys,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): void
    {
        if (!this.hasGroundBelow(collisionProbe)) {
            this.stopPrototypeWalk(false);
            this.moveDownWhenDue(map);
            return;
        }

        // Keep the next fall responsive after walking over a platform edge.
        this.verticalMovementAccumulator = 1;

        const requestedDirection = this.readHorizontalDirection(cursors);

        if (!requestedDirection) {
            this.stopPrototypeWalk();
            return;
        }

        this.applyDirectionChange(requestedDirection);

        const moved = this.moveHorizontallyWhenDue(requestedDirection, map, collisionProbe);

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

    private moveHorizontallyWhenDue(
        direction: FacingDirection,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): boolean
    {
        if (!this.shouldMoveHorizontallyThisFrame()) {
            return false;
        }

        if (this.isBlockedHorizontally(direction, collisionProbe)) {
            return false;
        }

        const deltaX = direction === "right" ? 1 : -1;
        const maxX = Math.max(0, map.widthInPixels - this.sprite.displayWidth);
        const nextX = this.clamp(this.sprite.x + deltaX, 0, maxX);

        if (nextX === this.sprite.x) {
            return false;
        }

        // Keep the temporary movement inside the imported map. The wall probes
        // above only test level tiles; this clamp still protects the outer map edge.
        this.sprite.x = nextX;
        return true;
    }

    private moveDownWhenDue(map: Tilemaps.Tilemap): boolean
    {
        if (!this.shouldMoveVerticallyThisFrame()) {
            return false;
        }

        const maxY = Math.max(0, map.heightInPixels - this.sprite.displayHeight);
        const nextY = this.clamp(this.sprite.y + 1, 0, maxY);

        if (nextY === this.sprite.y) {
            return false;
        }

        this.sprite.y = nextY;
        return true;
    }

    private isBlockedHorizontally(direction: FacingDirection, collisionProbe: TileCollisionProbe): boolean
    {
        const probeX = direction === "right"
            ? this.sprite.x + Player.RIGHT_WALL_X_OFFSET
            : this.sprite.x + Player.LEFT_WALL_X_OFFSET;

        return collisionProbe.hasWallOnVerticalLine(
            this.sprite.y + Player.SIDE_WALL_TOP_OFFSET,
            this.sprite.y + this.sprite.displayHeight - Player.SIDE_WALL_BOTTOM_OFFSET,
            probeX
        );
    }

    private hasGroundBelow(collisionProbe: TileCollisionProbe): boolean
    {
        return collisionProbe.hasSolidOnHorizontalLine(
            this.sprite.x + Player.FOOT_LEFT_OFFSET,
            this.sprite.x + Player.FOOT_RIGHT_OFFSET,
            this.sprite.y + this.sprite.displayHeight
        );
    }

    private shouldMoveHorizontallyThisFrame(): boolean
    {
        this.horizontalMovementAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.horizontalMovementAccumulator < 1) {
            return false;
        }

        this.horizontalMovementAccumulator -= 1;
        return true;
    }

    private shouldMoveVerticallyThisFrame(): boolean
    {
        this.verticalMovementAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.verticalMovementAccumulator < 1) {
            return false;
        }

        this.verticalMovementAccumulator -= 1;
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

    private stopPrototypeWalk(resetHorizontalMovement = true): void
    {
        if (resetHorizontalMovement) {
            this.horizontalMovementAccumulator = 1;
        }

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
