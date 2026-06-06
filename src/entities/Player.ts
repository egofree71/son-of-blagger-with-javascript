import type { GameObjects, Scene, Tilemaps, Types } from "phaser";
import { Data } from "../js/data";
import type { JumpStep } from "../js/data";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import type { TileCollisionProbe } from "../tiled/tileCollisionProbe";
import type { VanishingPlatforms } from "./VanishingPlatforms";

// Local direction names for the temporary Phaser 4 movement slice.
type FacingDirection = "left" | "right";

/**
 * Rectangle used by the first Phaser 4 interaction probes.
 */
export interface PlayerProbeRectangle
{
    xStart: number;
    yStart: number;
    xEnd: number;
    yEnd: number;
}

/**
 * Result returned by the temporary Phaser 4 movement slice.
 */
export interface PlayerPrototypeMovementResult
{
    playerKilledByDeadlyFall: boolean;
}

/**
 * Minimal Phaser 4 player entity used by the modernization prototype.
 *
 * This class owns the real Blagger sprite and a small movement test. It is still
 * not final gameplay: horizontal walking, side wall blocking, simple falling,
 * a first jump-path prototype, a small slide prototype, vanishing-platform
 * support, conveyors, and a first automatic-ladder prototype have been ported.
 * Key collection, deadly-tile detection, exit detection and the first visual
 * death sequence have temporary prototypes, while monsters are still absent. The current
 * goal is to validate the most sensitive manual movement probes before the full
 * Phaser 2 movement rules are moved over.
 */
export class Player
{
    // Tiled stores the player start at the bottom of the original 42px sprite.
    private static readonly TILED_Y_OFFSET = 42;

    // Keep Sid above animated tile overlays such as vanishing platforms.
    private static readonly SPRITE_DEPTH = 10;

    // Advance the walking frame only after a few accepted pixel moves.
    private static readonly WALK_ANIMATION_FRAME_INTERVAL = 5;

    // Horizontal foot probes copied from the Phaser 2 movement controller.
    private static readonly FOOT_LEFT_OFFSET = 7;
    private static readonly FOOT_RIGHT_OFFSET = 23;

    // Key collection uses its own narrow rectangle from PlayerInteractions.
    private static readonly KEY_LEFT_OFFSET = 7;
    private static readonly KEY_RIGHT_OFFSET = 23;
    private static readonly KEY_TOP_OFFSET = 0;
    private static readonly KEY_BOTTOM_OFFSET = 0;

    // Deadly tile checks use the slightly wider rectangle from PlayerInteractions.
    private static readonly DEADLY_LEFT_OFFSET = 5;
    private static readonly DEADLY_RIGHT_OFFSET = 27;
    private static readonly DEADLY_TOP_OFFSET = 0;
    private static readonly DEADLY_BOTTOM_OFFSET = -1;

    // Exit and future monster checks use the body rectangle from PlayerInteractions.
    private static readonly BODY_LEFT_OFFSET = 4;
    private static readonly BODY_RIGHT_OFFSET = 28;
    private static readonly BODY_TOP_OFFSET = 0;
    private static readonly BODY_BOTTOM_OFFSET = 0;

    // Slides are detected below the feet, like the Phaser 2 movement controller.
    private static readonly SLIDE_PROBE_Y_OFFSET = 14;

    // The ladder probe uses a small lower-body rectangle from the Phaser 2 code.
    private static readonly LADDER_LEFT_OFFSET = 7;
    private static readonly LADDER_RIGHT_OFFSET = 23;
    private static readonly LADDER_TOP_FROM_BOTTOM_OFFSET = 18;
    private static readonly LADDER_BOTTOM_FROM_BOTTOM_OFFSET = 1;

    // Side wall probes copied from the Phaser 2 movement controller.
    private static readonly RIGHT_WALL_X_OFFSET = 24;
    private static readonly LEFT_WALL_X_OFFSET = 5;
    private static readonly SIDE_WALL_TOP_OFFSET = 6;
    private static readonly SIDE_WALL_BOTTOM_OFFSET = 1;

    // Ceiling probes copied from the Phaser 2 movement controller.
    private static readonly WALL_ABOVE_Y_OFFSET = -2;

    // Data.jumpPath starts counting fall height again from this index onward.
    private static readonly JUMP_FALL_START_INDEX = 50;

    // A fall becomes deadly after the same 72-pixel threshold as Phaser 2.
    private static readonly FALL_LIMIT = 72;

    // Temporary prototype speed limiter. The real movement timing will be
    // revisited when the full Phaser 2 movement controller is ported.
    private static readonly PROTOTYPE_MOVE_FRAME_INTERVAL = 2;

    private static readonly LEFT_FRAMES: readonly number[] = [0, 1, 2, 3, 4, 5];
    private static readonly RIGHT_FRAMES: readonly number[] = [6, 7, 8, 9, 10, 11];
    private static readonly NO_PROTOTYPE_DEATH: PlayerPrototypeMovementResult = {
        playerKilledByDeadlyFall: false
    };

    private readonly sprite: GameObjects.Sprite;
    private readonly normalTextureKey: string;
    private readonly deadlyFallTextureKey: string;
    private facingDirection: FacingDirection = "right";
    private animationFrameIndex = 0;
    private animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
    private horizontalMovementAccumulator = 1;
    private verticalMovementAccumulator = 1;
    private slideMovementAccumulator = 1;
    private jumpStepAccumulator = 1;
    private jumping = false;
    private jumpIndex = 0;
    private jumpHorizontalDirection: FacingDirection | null = null;
    private fallHeight = 0;
    private deadlyFall = false;

    constructor(scene: Scene, textureKey: string, deadlyFallTextureKey: string)
    {
        this.normalTextureKey = textureKey;
        this.deadlyFallTextureKey = deadlyFallTextureKey;
        this.sprite = scene.add.sprite(0, 0, textureKey, this.firstFrameFor("right"))
            .setOrigin(0, 0)
            .setDepth(Player.SPRITE_DEPTH)
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
        this.slideMovementAccumulator = 1;
        this.jumpStepAccumulator = 1;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.fallHeight = 0;
        this.deadlyFall = false;
        this.sprite.setTexture(this.normalTextureKey, this.firstFrameFor(this.facingDirection));
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
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): PlayerPrototypeMovementResult
    {
        if (this.deadlyFall) {
            return {
                playerKilledByDeadlyFall: this.updateDeadlyFall(map, collisionProbe)
            };
        }

        if (this.jumping) {
            this.updateJumpWhenDue(map, collisionProbe, vanishingPlatforms);
            return Player.NO_PROTOTYPE_DEATH;
        }

        const slideDirection = this.readSlideDirectionBelow(collisionProbe);
        const onLadder = this.isOnLadder(collisionProbe);
        const hasStandingSurface = this.hasStandingSurfaceBelow(collisionProbe, vanishingPlatforms);
        const conveyorDirection = hasStandingSurface
            ? this.readConveyorDirectionBelow(collisionProbe)
            : null;
        const requestedDirection = this.readHorizontalDirection(cursors);

        if (hasStandingSurface || slideDirection || onLadder) {
            // Stable surfaces and ladders should not inherit a delayed fall from
            // the previous frame. The full Phaser 2 fall-height rule comes later.
            this.verticalMovementAccumulator = 1;
            this.jumpStepAccumulator = 1;
            this.fallHeight = 0;
        }

        if (!slideDirection) {
            // Entering a slide should start with an immediate diagonal step; do
            // not inherit a half-used slide timer from a previous slope.
            this.slideMovementAccumulator = 1;
        }

        if ((hasStandingSurface || slideDirection) && this.isJumpRequested(cursors)) {
            this.startJump(requestedDirection);
            this.updateJumpWhenDue(map, collisionProbe, vanishingPlatforms);
            return Player.NO_PROTOTYPE_DEATH;
        }

        if (slideDirection) {
            this.moveOnSlideWhenDue(slideDirection, requestedDirection, map, collisionProbe);
            return Player.NO_PROTOTYPE_DEATH;
        }

        if (onLadder) {
            this.moveOnLadderWhenDue(requestedDirection, map, collisionProbe);
            return Player.NO_PROTOTYPE_DEATH;
        }

        if (!hasStandingSurface) {
            this.stopPrototypeWalk(false);

            if (this.moveDownWhileFallingWhenDue(map)) {
                this.recordFallPixel();
            }

            return Player.NO_PROTOTYPE_DEATH;
        }

        if (conveyorDirection) {
            this.moveOnConveyorWhenDue(conveyorDirection, requestedDirection, map, collisionProbe);
            return Player.NO_PROTOTYPE_DEATH;
        }

        if (!requestedDirection) {
            this.stopPrototypeWalk();
            return Player.NO_PROTOTYPE_DEATH;
        }

        this.applyDirectionChange(requestedDirection);

        const moved = this.moveHorizontallyWhenDue(requestedDirection, map, collisionProbe);

        if (moved) {
            this.advanceWalkingFrameWhenDue();
        }

        return Player.NO_PROTOTYPE_DEATH;
    }

    /**
     * Cancels temporary gameplay movement before debug free-move takes over.
     *
     * Without this reset, releasing a debug key during a jump or fall could
     * resume an old in-progress movement state from the new debug position.
     */
    cancelPrototypeMovementForDebug(): void
    {
        this.horizontalMovementAccumulator = 1;
        this.verticalMovementAccumulator = 1;
        this.slideMovementAccumulator = 1;
        this.jumpStepAccumulator = 1;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.fallHeight = 0;
        this.deadlyFall = false;
        this.sprite.setTexture(this.normalTextureKey, this.firstFrameFor(this.facingDirection));
        this.stopPrototypeWalk(false);
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

    /**
     * Returns the top-left position used by the temporary death sprite.
     */
    getDeathAnimationOrigin(): { x: number; y: number }
    {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }

    /**
     * Hides the normal sprite before the separate death animation sprite plays.
     */
    hideForDeathAnimation(): void
    {
        // Death interrupts temporary movement, but preserves deadlyFall so the
        // death sequence can choose the white falling-death sprite.
        this.horizontalMovementAccumulator = 1;
        this.verticalMovementAccumulator = 1;
        this.slideMovementAccumulator = 1;
        this.jumpStepAccumulator = 1;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.stopPrototypeWalk(false);
        this.sprite.setVisible(false);
    }

    /**
     * Tells whether the current death sequence was caused by falling too far.
     */
    isDeadlyFall(): boolean
    {
        return this.deadlyFall;
    }

    /**
     * Returns the narrow rectangle used by the Phaser 2 key collection check.
     */
    getKeyCollectionBounds(): PlayerProbeRectangle
    {
        return {
            xStart: this.sprite.x + Player.KEY_LEFT_OFFSET,
            yStart: this.sprite.y + Player.KEY_TOP_OFFSET,
            xEnd: this.sprite.x + Player.KEY_RIGHT_OFFSET,
            yEnd: this.sprite.y + this.sprite.displayHeight + Player.KEY_BOTTOM_OFFSET
        };
    }

    /**
     * Returns the narrow rectangle used by the Phaser 2 deadly tile check.
     */
    getDeadlyCollisionBounds(): PlayerProbeRectangle
    {
        return {
            xStart: this.sprite.x + Player.DEADLY_LEFT_OFFSET,
            yStart: this.sprite.y + Player.DEADLY_TOP_OFFSET,
            xEnd: this.sprite.x + Player.DEADLY_RIGHT_OFFSET,
            yEnd: this.sprite.y + this.sprite.displayHeight + Player.DEADLY_BOTTOM_OFFSET
        };
    }

    /**
     * Returns the body rectangle used by Phaser 2 exit and monster checks.
     */
    getBodyCollisionBounds(): PlayerProbeRectangle
    {
        return {
            xStart: this.sprite.x + Player.BODY_LEFT_OFFSET,
            yStart: this.sprite.y + Player.BODY_TOP_OFFSET,
            xEnd: this.sprite.x + Player.BODY_RIGHT_OFFSET,
            yEnd: this.sprite.y + this.sprite.displayHeight + Player.BODY_BOTTOM_OFFSET
        };
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

    private updateJumpWhenDue(
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): void
    {
        if (!this.shouldAdvanceJumpThisFrame()) {
            return;
        }

        const jumpStep = Data.jumpPath[this.jumpIndex];

        if (!jumpStep) {
            this.finishJump(false);
            return;
        }

        this.applyJumpStep(jumpStep, map, collisionProbe, vanishingPlatforms);

        this.jumpIndex += 1;

        if (this.jumpIndex >= Data.jumpPath.length) {
            this.finishJump(false);
        }
    }

    private applyJumpStep(
        jumpStep: JumpStep,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): void
    {
        const [allowHorizontalMovement, verticalDirection] = jumpStep;

        if (allowHorizontalMovement && this.jumpHorizontalDirection) {
            this.moveHorizontallyByOnePixel(
                this.jumpHorizontalDirection,
                map,
                collisionProbe
            );

            // During a jump the original animation keeps running even when a
            // wall blocks horizontal movement. The blocked wall changes position,
            // not the remembered jump effort or the leg animation.
            this.advanceWalkingFrameWhenDue();
        }

        if (verticalDirection === "UP") {
            this.moveUpByOnePixel(map, collisionProbe);
            return;
        }

        if (verticalDirection === "DOWN") {
            this.moveDownDuringJump(map, collisionProbe, vanishingPlatforms);
        }
    }

    private moveDownDuringJump(
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): boolean
    {
        if (this.hasLandingSurfaceBelow(collisionProbe, vanishingPlatforms)) {
            this.finishJump(true);
            return false;
        }

        const moved = this.moveDownByOnePixel(map);

        if (moved && this.jumpIndex >= Player.JUMP_FALL_START_INDEX) {
            this.recordFallPixel();
        }

        return moved;
    }

    private finishJump(resetFallHeight: boolean): void
    {
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;

        if (resetFallHeight) {
            this.fallHeight = 0;
        }

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
        slideDirection: FacingDirection,
        requestedDirection: FacingDirection | null,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): void
    {
        if (requestedDirection) {
            // Phaser 2 lets the slide force movement while left/right input still
            // owns the walking animation direction. This can look odd on opposite
            // input, but it keeps the old input-first, environment-second order.
            this.applyDirectionChange(requestedDirection);
        }

        if (!this.shouldMoveOnSlideThisFrame()) {
            return;
        }

        // Slides apply one diagonal step as a single environment decision. Using
        // the normal horizontal and falling timers independently made the slope
        // cadence drift away from the rest of the temporary movement prototype.
        this.moveHorizontallyByOnePixel(slideDirection, map, collisionProbe);
        this.moveDownByOnePixel(map);

        if (requestedDirection) {
            // Standing on a slide without input should keep Sid's current frame;
            // pressing left/right animates exactly like normal walking.
            this.advanceWalkingFrameWhenDue();
        }
    }

    private moveOnConveyorWhenDue(
        conveyorDirection: FacingDirection,
        requestedDirection: FacingDirection | null,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): void
    {
        if (requestedDirection) {
            this.applyDirectionChange(requestedDirection);
        }

        if (!this.shouldMoveHorizontallyThisFrame()) {
            return;
        }

        // Conveyor belts choose the actual movement direction. Holding the
        // opposite arrow cancels the belt movement, just like the Phaser 2 code.
        const conveyorCancelledByInput = requestedDirection !== null && requestedDirection !== conveyorDirection;

        if (!conveyorCancelledByInput) {
            this.moveHorizontallyByOnePixel(conveyorDirection, map, collisionProbe);
        }

        if (requestedDirection) {
            // Automatic belt movement alone does not animate Sid. Left/right
            // input still shows the normal walking animation, even when the belt
            // cancels the resulting horizontal move for that frame.
            this.advanceWalkingFrameWhenDue();
        }
    }

    private moveOnLadderWhenDue(
        requestedDirection: FacingDirection | null,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe
    ): void
    {
        this.moveUpWhenDue(map, collisionProbe);

        if (!requestedDirection) {
            // Ladders move Sid upward automatically, but the player animation
            // stays on its current frame unless left/right input is also held.
            return;
        }

        this.applyDirectionChange(requestedDirection);
        const movedHorizontally = this.moveHorizontallyWhenDue(requestedDirection, map, collisionProbe);

        if (movedHorizontally) {
            // Match normal walking cadence while Sid crosses a ladder. The
            // vertical ladder movement alone must not spin the walking frames.
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

    private moveDownWhileFallingWhenDue(map: Tilemaps.Tilemap): boolean
    {
        if (!this.shouldMoveVerticallyThisFrame()) {
            return false;
        }

        return this.moveDownByOnePixel(map);
    }

    private updateDeadlyFall(map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): boolean
    {
        // Once a fall is deadly, Phaser 2 suspends controls and keeps dropping Sid
        // until his feet reach the top of the next solid tile. Keep using the
        // same vertical timer as the normal prototype fall so the white fall does
        // not suddenly accelerate.
        if (this.hasDeadlyFallLandingSurfaceBelow(collisionProbe)) {
            return true;
        }

        if (!this.shouldMoveVerticallyThisFrame()) {
            return false;
        }

        this.moveDownByOnePixel(map);
        return false;
    }

    private moveDownWhenDue(map: Tilemaps.Tilemap): boolean
    {
        if (!this.shouldMoveVerticallyThisFrame()) {
            return false;
        }

        return this.moveDownByOnePixel(map);
    }

    private moveUpWhenDue(map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): boolean
    {
        if (!this.shouldMoveVerticallyThisFrame()) {
            return false;
        }

        return this.moveUpByOnePixel(map, collisionProbe);
    }

    private moveDownByOnePixel(map: Tilemaps.Tilemap): boolean
    {
        // The clamp prevents falling outside the map data while movement rules are
        // still being ported one slice at a time.
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

    private hasStandingSurfaceBelow(
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): boolean
    {
        return this.hasSolidGroundBelow(collisionProbe) ||
            this.hasVanishingPlatformBelow(vanishingPlatforms);
    }

    private hasLandingSurfaceBelow(
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): boolean
    {
        // The Phaser 2 reference lets a jump land on solid tiles, slide tiles and
        // visible vanishing platforms. Without the extra checks, several classic
        // level-1 jumps turn into immediate falls.
        return collisionProbe.hasSolidTopOnHorizontalLine(
            this.sprite.x + Player.FOOT_LEFT_OFFSET,
            this.sprite.x + Player.FOOT_RIGHT_OFFSET,
            this.sprite.y + this.sprite.displayHeight
        ) ||
            collisionProbe.hasSlideTopOnHorizontalLine(
                this.sprite.x + Player.FOOT_LEFT_OFFSET,
                this.sprite.x + Player.FOOT_RIGHT_OFFSET,
                this.sprite.y + this.sprite.displayHeight
            ) ||
            this.hasVanishingPlatformBelow(vanishingPlatforms);
    }

    private hasDeadlyFallLandingSurfaceBelow(collisionProbe: TileCollisionProbe): boolean
    {
        // Deadly falls stop only on solid tile tops in the Phaser 2 reference.
        // Slides and vanishing platforms are deliberately not death triggers here.
        return collisionProbe.hasSolidTopOnHorizontalLine(
            this.sprite.x + Player.FOOT_LEFT_OFFSET,
            this.sprite.x + Player.FOOT_RIGHT_OFFSET,
            this.sprite.y + this.sprite.displayHeight
        );
    }

    private hasVanishingPlatformBelow(vanishingPlatforms: VanishingPlatforms): boolean
    {
        return vanishingPlatforms.hasCollisionOnHorizontalLine(
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

    private readConveyorDirectionBelow(collisionProbe: TileCollisionProbe): FacingDirection | null
    {
        const xStart = this.sprite.x + Player.FOOT_LEFT_OFFSET;
        const xEnd = this.sprite.x + Player.FOOT_RIGHT_OFFSET;
        const y = this.sprite.y + this.sprite.displayHeight;

        // Conveyors are detected exactly on the foot line in Phaser 2. Unlike
        // slides, they do not use the lower slope probe offset.
        if (collisionProbe.hasRightConveyorOnHorizontalLine(xStart, xEnd, y)) {
            return "right";
        }

        if (collisionProbe.hasLeftConveyorOnHorizontalLine(xStart, xEnd, y)) {
            return "left";
        }

        return null;
    }

    private isOnLadder(collisionProbe: TileCollisionProbe): boolean
    {
        const xStart = this.sprite.x + Player.LADDER_LEFT_OFFSET;
        const xEnd = this.sprite.x + Player.LADDER_RIGHT_OFFSET;
        const yStart = this.sprite.y + this.sprite.displayHeight - Player.LADDER_TOP_FROM_BOTTOM_OFFSET;
        const yEnd = this.sprite.y + this.sprite.displayHeight - Player.LADDER_BOTTOM_FROM_BOTTOM_OFFSET;

        // The ladder probe is a small lower-body rectangle. Using the full sprite
        // would let Sid catch ladders from too far away.
        return collisionProbe.hasLadderInRectangle(xStart, yStart, xEnd, yEnd);
    }

    private recordFallPixel(): void
    {
        if (this.deadlyFall) {
            return;
        }

        this.fallHeight += 1;

        if (this.fallHeight >= Player.FALL_LIMIT) {
            this.startDeadlyFall();
        }
    }

    private startDeadlyFall(): void
    {
        this.deadlyFall = true;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.stopPrototypeWalk(false);

        // The normal sprite turns white during the uncontrollable falling part,
        // then the death sequence switches to the white dying spritesheet.
        this.sprite.setTexture(this.deadlyFallTextureKey, this.framesFor(this.facingDirection)[this.animationFrameIndex]);
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

    private shouldMoveOnSlideThisFrame(): boolean
    {
        // Use one shared timer for the forced diagonal slope movement. The two
        // axes should move together instead of competing through separate walking
        // and falling accumulators.
        this.slideMovementAccumulator += 1 / Player.PROTOTYPE_MOVE_FRAME_INTERVAL;

        if (this.slideMovementAccumulator < 1) {
            return false;
        }

        this.slideMovementAccumulator -= 1;
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
