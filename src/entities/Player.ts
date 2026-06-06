import type { GameObjects, Scene, Tilemaps, Types } from "phaser";
import { Data } from "../js/data";
import type { JumpStep } from "../js/data";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import type { TileCollisionProbe } from "../tiled/tileCollisionProbe";

// Local direction names for the temporary Phaser 4 movement slice.
type FacingDirection = "left" | "right";

/**
 * Minimal Phaser 4 player entity used by the modernization prototype.
 *
 * This class owns the real Blagger sprite and a small movement test. It is still
 * not final gameplay: horizontal walking, side wall blocking, simple falling,
 * a first jump-path prototype and a small slide prototype have been ported.
 * Ladder logic, conveyors and interaction handling are still absent. The
 * current goal is to validate the most sensitive manual movement probes before
 * the full Phaser 2 movement rules are moved over.
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

    // Slides are detected below the feet, like the Phaser 2 movement controller.
    private static readonly SLIDE_PROBE_Y_OFFSET = 14;

    // Side wall probes copied from the Phaser 2 movement controller.
    private static readonly RIGHT_WALL_X_OFFSET = 24;
    private static readonly LEFT_WALL_X_OFFSET = 5;
    private static readonly SIDE_WALL_TOP_OFFSET = 6;
    private static readonly SIDE_WALL_BOTTOM_OFFSET = 1;

    // Ceiling probes copied from the Phaser 2 movement controller.
    private static readonly WALL_ABOVE_Y_OFFSET = -2;

    // Data.jumpPath starts counting fall height again from this index onward.
    private static readonly JUMP_FALL_START_INDEX = 50;

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
    private jumpStepAccumulator = 1;
    private jumping = false;
    private jumpIndex = 0;
    private jumpHorizontalDirection: FacingDirection | null = null;

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
        this.jumpStepAccumulator = 1;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.sprite.setFrame(this.firstFrameFor(this.facingDirection));
        this.sprite.setVisible(true);
    }

    /**
     * Runs the temporary walking/falling/jumping movement slice for one frame.
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
        if (this.jumping) {
            this.updateJumpWhenDue(map, collisionProbe);
            return;
        }

        const slideDirection = this.readSlideDirectionBelow(collisionProbe);

        if (!slideDirection && !this.hasSolidGroundBelow(collisionProbe)) {
            this.stopPrototypeWalk(false);
            this.moveDownWhenDue(map);
            return;
        }

        // Keep the next fall or jump responsive after walking on stable ground.
        this.verticalMovementAccumulator = 1;
        this.jumpStepAccumulator = 1;

        const requestedDirection = this.readHorizontalDirection(cursors);

        if (this.isJumpRequested(cursors)) {
            this.startJump(requestedDirection);
            this.updateJumpWhenDue(map, collisionProbe);
            return;
        }

        if (slideDirection) {
            this.moveOnSlideWhenDue(slideDirection, map, collisionProbe);
            return;
        }

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

    private isJumpRequested(cursors: Types.Input.Keyboard.CursorKeys): boolean
    {
        return cursors.space?.isDown === true;
    }

    private startJump(requestedDirection: FacingDirection | null): void
    {
        this.jumping = true;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = requestedDirection;

        if (requestedDirection) {
            this.applyDirectionChange(requestedDirection);
        }

        // Jump movement is driven by Data.jumpPath, so the normal falling
        // accumulator should not leak into the first jump step.
        this.jumpStepAccumulator = 1;
    }

    private updateJumpWhenDue(map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): void
    {
        if (!this.shouldAdvanceJumpThisFrame()) {
            return;
        }

        const jumpStep = Data.jumpPath[this.jumpIndex];

        if (!jumpStep) {
            this.finishJump();
            return;
        }

        this.applyJumpStep(jumpStep, map, collisionProbe);

        this.jumpIndex += 1;

        if (this.jumpIndex >= Data.jumpPath.length) {
            this.finishJump();
        }
    }

    private applyJumpStep(jumpStep: JumpStep, map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): void
    {
        const [allowHorizontalMovement, verticalDirection] = jumpStep;

        if (allowHorizontalMovement && this.jumpHorizontalDirection) {
            const movedHorizontally = this.moveHorizontallyByOnePixel(
                this.jumpHorizontalDirection,
                map,
                collisionProbe
            );

            if (movedHorizontally) {
                this.advanceWalkingFrameWhenDue();
            }
        }

        if (verticalDirection === "UP") {
            this.moveUpByOnePixel(map, collisionProbe);
            return;
        }

        if (verticalDirection === "DOWN") {
            this.moveDownDuringJump(map, collisionProbe);
        }
    }

    private moveDownDuringJump(map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): boolean
    {
        if (this.hasLandingSurfaceBelow(collisionProbe)) {
            this.finishJump();
            return false;
        }

        return this.moveDownByOnePixel(map);
    }

    private finishJump(): void
    {
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;

        // Like Phaser 2's stopAnimation(), landing keeps the current visual frame.
        this.stopPrototypeWalk(false);
    }

    private applyDirectionChange(direction: FacingDirection): void
    {
        if (this.facingDirection === direction) {
            return;
        }

        // Restart the frame sequence when the player turns around. The Phaser 2
        // version used separate left/right animations rather than mirroring.
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

        return this.moveHorizontallyByOnePixel(direction, map, collisionProbe);
    }

    private moveOnSlideWhenDue(
        direction: FacingDirection,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): void
    {
        this.applyDirectionChange(direction);

        // The slide prototype follows the Phaser 2 rule that a slide forces both
        // horizontal movement and a one-pixel descent instead of behaving like
        // normal ground. Jump input is checked before this method, so Sid can
        // still jump while standing on the slope.
        const movedHorizontally = this.moveHorizontallyWhenDue(direction, map, collisionProbe);
        const movedVertically = this.moveDownWhenDue(map);

        if (movedHorizontally || movedVertically) {
            this.advanceWalkingFrameWhenDue();
        }
    }

    private moveHorizontallyByOnePixel(
        direction: FacingDirection,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): boolean
    {
        if (this.isBlockedHorizontally(direction, collisionProbe)) {
            return false;
        }

        // The temporary movement still uses one-pixel steps because the Phaser 2
        // reference checks walls at pixel precision, not through velocities.
        const deltaX = direction === "right" ? 1 : -1;

        // Keep the sprite inside the imported map. Tile probes detect walls, but
        // the outer map edge is just a viewport boundary for this prototype.
        const maxX = Math.max(0, map.widthInPixels - this.sprite.displayWidth);
        const nextX = this.clamp(this.sprite.x + deltaX, 0, maxX);

        if (nextX === this.sprite.x) {
            return false;
        }

        this.sprite.x = nextX;
        return true;
    }

    private moveDownWhenDue(map: Tilemaps.Tilemap): boolean
    {
        if (!this.shouldMoveVerticallyThisFrame()) {
            return false;
        }

        return this.moveDownByOnePixel(map);
    }

    private moveDownByOnePixel(map: Tilemaps.Tilemap): boolean
    {
        // This is a simple prototype fall, not the final Phaser 2 fall-speed or
        // deadly-fall rule. The clamp only prevents falling outside the map data.
        const maxY = Math.max(0, map.heightInPixels - this.sprite.displayHeight);
        const nextY = this.clamp(this.sprite.y + 1, 0, maxY);

        if (nextY === this.sprite.y) {
            return false;
        }

        this.sprite.y = nextY;
        return true;
    }

    private moveUpByOnePixel(map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): boolean
    {
        if (this.isBlockedAbove(collisionProbe)) {
            return false;
        }

        // The jump path moves up in one-pixel steps. The map clamp prevents the
        // prototype from leaving the Tiled world before upper collisions are final.
        const nextY = this.clamp(this.sprite.y - 1, 0, map.heightInPixels - this.sprite.displayHeight);

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

        // The side probe ignores the very top and bottom of the sprite. That
        // tolerance comes from the Phaser 2 movement code and avoids treating the
        // whole visual rectangle as a hard collision box.
        return collisionProbe.hasWallOnVerticalLine(
            this.sprite.y + Player.SIDE_WALL_TOP_OFFSET,
            this.sprite.y + this.sprite.displayHeight - Player.SIDE_WALL_BOTTOM_OFFSET,
            probeX
        );
    }

    private isBlockedAbove(collisionProbe: TileCollisionProbe): boolean
    {
        // Ceiling checks reuse the same narrow foot span as the Phaser 2 code.
        // Testing the full sprite width would make jumps hit ceilings too early.
        return collisionProbe.hasWallOnHorizontalLine(
            this.sprite.x + Player.FOOT_LEFT_OFFSET,
            this.sprite.x + Player.FOOT_RIGHT_OFFSET,
            this.sprite.y + Player.WALL_ABOVE_Y_OFFSET
        );
    }

    private hasSolidGroundBelow(collisionProbe: TileCollisionProbe): boolean
    {
        // The foot probe is deliberately narrower than the visible sprite. The
        // old movement code used these offsets so Sid can stand close to edges.
        return collisionProbe.hasSolidOnHorizontalLine(
            this.sprite.x + Player.FOOT_LEFT_OFFSET,
            this.sprite.x + Player.FOOT_RIGHT_OFFSET,
            this.sprite.y + this.sprite.displayHeight
        );
    }

    private hasLandingSurfaceBelow(collisionProbe: TileCollisionProbe): boolean
    {
        // The Phaser 2 reference lets a jump land on both solid tiles and slide
        // tiles. Without the slide check, pressing jump on a toboggan immediately
        // falls instead of starting the jump path.
        return this.hasSolidGroundBelow(collisionProbe) ||
            collisionProbe.hasSlideOnHorizontalLine(
                this.sprite.x + Player.FOOT_LEFT_OFFSET,
                this.sprite.x + Player.FOOT_RIGHT_OFFSET,
                this.sprite.y + this.sprite.displayHeight
            );
    }

    private readSlideDirectionBelow(collisionProbe: TileCollisionProbe): FacingDirection | null
    {
        const xStart = this.sprite.x + Player.FOOT_LEFT_OFFSET;
        const xEnd = this.sprite.x + Player.FOOT_RIGHT_OFFSET;
        const y = this.sprite.y + this.sprite.displayHeight + Player.SLIDE_PROBE_Y_OFFSET;

        // The slope probe is lower than the normal foot probe. This matches the
        // original check that detects slides only once Sid is visibly on them.
        if (collisionProbe.hasLeftSlideOnHorizontalLine(xStart, xEnd, y)) {
            return "left";
        }

        if (collisionProbe.hasRightSlideOnHorizontalLine(xStart, xEnd, y)) {
            return "right";
        }

        return null;
    }

    private shouldMoveHorizontallyThisFrame(): boolean
    {
        // Keep the temporary walking speed slower than one pixel every update.
        // Later, this should be replaced by the real Phaser 2 movement timing.
        this.horizontalMovementAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.horizontalMovementAccumulator < 1) {
            return false;
        }

        this.horizontalMovementAccumulator -= 1;
        return true;
    }

    private shouldMoveVerticallyThisFrame(): boolean
    {
        // Reuse the same accumulator pattern as horizontal movement so the first
        // falling prototype stays visually comparable to walking speed.
        this.verticalMovementAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.verticalMovementAccumulator < 1) {
            return false;
        }

        this.verticalMovementAccumulator -= 1;
        return true;
    }

    private shouldAdvanceJumpThisFrame(): boolean
    {
        // The real jump path is kept, but the whole prototype still runs at the
        // temporary movement pace chosen during the first walking tests.
        this.jumpStepAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.jumpStepAccumulator < 1) {
            return false;
        }

        this.jumpStepAccumulator -= 1;
        return true;
    }

    private advanceWalkingFrameWhenDue(): void
    {
        this.animationFrameCounter -= 1;

        if (this.animationFrameCounter > 0) {
            return;
        }

        // Animation advances only after accepted pixel movement. This avoids the
        // legs spinning while a wall or the map edge blocks the sprite.
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
