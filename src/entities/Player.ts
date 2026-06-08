import type { GameObjects, Scene, Tilemaps } from "phaser";
import { Data } from "../data/gameData";
import type { JumpStep } from "../data/gameData";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import type { TileCollisionProbe } from "../tiled/tileCollisionProbe";
import type { VanishingPlatforms } from "./VanishingPlatforms";
import type { PlayerInputState } from "../input/PlayerInputState";

// Local direction names for Sid's horizontal facing and movement.
type FacingDirection = "left" | "right";

/**
 * Axis-aligned rectangle used by manual interaction probes.
 */
export interface PlayerProbeRectangle
{
    xStart: number;
    yStart: number;
    xEnd: number;
    yEnd: number;
}

/**
 * Result returned by the player movement update.
 */
export interface PlayerMovementResult
{
    playerKilledByDeadlyFall: boolean;
}

/**
 * Player entity for Slippery Sid.
 *
 * The class owns Sid's sprite, manual movement, jump path, falling rules and the
 * probe rectangles used by keys, traps, exits and monsters. Movement is kept
 * pixel-step based because the level data relies on very small offsets around
 * ladders, slides, conveyors and platform edges.
 */
export class Player
{
    // Tiled stores the player start at the bottom of the original 42px sprite.
    private static readonly TILED_Y_OFFSET = 42;

    // Keep Sid above animated tile overlays such as vanishing platforms.
    private static readonly SPRITE_DEPTH = 10;

    // Advance the walking frame only after a few accepted pixel moves.
    private static readonly WALK_ANIMATION_FRAME_INTERVAL = 5;

    // Horizontal foot probe: narrower than the sprite so edge landings feel fair.
    private static readonly FOOT_LEFT_OFFSET = 7;
    private static readonly FOOT_RIGHT_OFFSET = 23;

    // Key pickup uses a narrow body rectangle so keys are not grabbed too early.
    private static readonly KEY_LEFT_OFFSET = 7;
    private static readonly KEY_RIGHT_OFFSET = 23;
    private static readonly KEY_TOP_OFFSET = 0;
    private static readonly KEY_BOTTOM_OFFSET = 0;

    // Trap checks are slightly wider than key pickup to match visible danger zones.
    private static readonly DEADLY_LEFT_OFFSET = 5;
    private static readonly DEADLY_RIGHT_OFFSET = 27;
    private static readonly DEADLY_TOP_OFFSET = 0;
    private static readonly DEADLY_BOTTOM_OFFSET = -1;

    // Exits and monsters use a body rectangle close to Sid's visible torso.
    private static readonly BODY_LEFT_OFFSET = 4;
    private static readonly BODY_RIGHT_OFFSET = 28;
    private static readonly BODY_TOP_OFFSET = 0;
    private static readonly BODY_BOTTOM_OFFSET = 0;

    // Slides are detected slightly below the foot line.
    private static readonly SLIDE_PROBE_Y_OFFSET = 14;

    // Ladders use a small lower-body probe to avoid catching them from far away.
    private static readonly LADDER_LEFT_OFFSET = 7;
    private static readonly LADDER_RIGHT_OFFSET = 23;
    private static readonly LADDER_TOP_FROM_BOTTOM_OFFSET = 18;
    private static readonly LADDER_BOTTOM_FROM_BOTTOM_OFFSET = 1;

    // Side wall probes ignore the top and bottom of the sprite.
    private static readonly RIGHT_WALL_X_OFFSET = 24;
    private static readonly LEFT_WALL_X_OFFSET = 5;
    private static readonly SIDE_WALL_TOP_OFFSET = 6;
    private static readonly SIDE_WALL_BOTTOM_OFFSET = 1;

    // Ceiling probes use a narrow line just above Sid.
    private static readonly WALL_ABOVE_Y_OFFSET = -2;

    // Data.jumpPath starts counting fall height again from this index onward.
    private static readonly JUMP_FALL_START_INDEX = 50;

    // A fall becomes deadly after 72 pixels.
    private static readonly FALL_LIMIT = 72;

    // Most manual movement advances one pixel every other update tick. Separate
    // accumulators below keep walking, falling, jumping, slides and ladders from
    // stealing cadence from each other.
    private static readonly MOVE_FRAME_INTERVAL = 2;

    private static readonly LEFT_FRAMES: readonly number[] = [0, 1, 2, 3, 4, 5];
    private static readonly RIGHT_FRAMES: readonly number[] = [6, 7, 8, 9, 10, 11];
    private static readonly NO_MOVEMENT_DEATH: PlayerMovementResult = {
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
    private ladderMovementAccumulator = 1;
    private jumpStepAccumulator = 1;
    private jumping = false;
    private jumpIndex = 0;
    private jumpHorizontalDirection: FacingDirection | null = null;
    private fallHeight = 0;
    private deadlyFall = false;

    /**
     * @param scene Gameplay scene that owns Sid's sprite.
     * @param textureKey Spritesheet key for the normal player animation.
     * @param deadlyFallTextureKey Spritesheet key for the white falling-death variant.
     */
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
     * Converts a Tiled player object into the sprite top-left position.
     */
    static getTiledStartPosition(startObject: TiledObjectLike): { x: number; y: number }
    {
        return {
            x: startObject.x,
            y: startObject.y - Player.TILED_Y_OFFSET
        };
    }

    /**
     * Places the player sprite on the current level start object.
     */
    resetToTiledStart(startObject: TiledObjectLike): void
    {
        const startPosition = Player.getTiledStartPosition(startObject);

        this.sprite.setPosition(startPosition.x, startPosition.y);

        this.facingDirection = "right";
        this.animationFrameIndex = 0;
        this.animationFrameCounter = Player.WALK_ANIMATION_FRAME_INTERVAL;
        this.horizontalMovementAccumulator = 1;
        this.verticalMovementAccumulator = 1;
        this.slideMovementAccumulator = 1;
        this.ladderMovementAccumulator = 1;
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
     * Runs Sid's walking, falling, jumping and environment movement for one frame.
     *
     * Movement stays manual instead of using Arcade Physics. Every step is tested
     * through tile probes so the same sprite can interact precisely with narrow
     * walls, ladders, slides and conveyor tiles.
     */
    updateMovement(
        inputState: PlayerInputState,
        map: Tilemaps.Tilemap,
        collisionProbe: TileCollisionProbe,
        vanishingPlatforms: VanishingPlatforms
    ): PlayerMovementResult
    {
        if (this.deadlyFall) {
            return {
                playerKilledByDeadlyFall: this.updateDeadlyFall(map, collisionProbe)
            };
        }

        if (this.jumping) {
            this.updateJumpWhenDue(map, collisionProbe, vanishingPlatforms);
            return Player.NO_MOVEMENT_DEATH;
        }

        const slideDirection = this.readSlideDirectionBelow(collisionProbe);
        const onLadder = this.isOnLadder(collisionProbe);
        const hasStandingSurface = this.hasStandingSurfaceBelow(collisionProbe, vanishingPlatforms);
        const conveyorDirection = hasStandingSurface
            ? this.readConveyorDirectionBelow(collisionProbe)
            : null;
        const requestedDirection = this.readHorizontalDirection(inputState);

        if (hasStandingSurface || slideDirection) {
            // Stable ground should not inherit a delayed fall from the previous
            // frame. Ladders use their own timer below so they do not climb too fast.
            this.verticalMovementAccumulator = 1;
            this.jumpStepAccumulator = 1;
            this.fallHeight = 0;
        }
        else if (onLadder) {
            this.jumpStepAccumulator = 1;
            this.fallHeight = 0;
        }

        if (!slideDirection) {
            // Entering a slide should start with an immediate diagonal step; do
            // not inherit a half-used slide timer from a previous slope.
            this.slideMovementAccumulator = 1;
        }

        if (!onLadder) {
            // Ladder movement is automatic, but it should still keep its own
            // cadence instead of being forced by the general vertical timer.
            this.ladderMovementAccumulator = 1;
        }

        if ((hasStandingSurface || slideDirection) && this.isJumpRequested(inputState)) {
            this.startJump(requestedDirection);
            this.updateJumpWhenDue(map, collisionProbe, vanishingPlatforms);
            return Player.NO_MOVEMENT_DEATH;
        }

        if (slideDirection) {
            this.moveOnSlideWhenDue(slideDirection, requestedDirection, map, collisionProbe);
            return Player.NO_MOVEMENT_DEATH;
        }

        if (onLadder) {
            this.moveOnLadderWhenDue(requestedDirection, map, collisionProbe);
            return Player.NO_MOVEMENT_DEATH;
        }

        if (!hasStandingSurface) {
            this.stopWalk(false);

            if (this.moveDownWhileFallingWhenDue(map)) {
                this.recordFallPixel();
            }

            return Player.NO_MOVEMENT_DEATH;
        }

        if (conveyorDirection) {
            this.moveOnConveyorWhenDue(conveyorDirection, requestedDirection, map, collisionProbe);
            return Player.NO_MOVEMENT_DEATH;
        }

        if (!requestedDirection) {
            this.stopWalk();
            return Player.NO_MOVEMENT_DEATH;
        }

        this.applyDirectionChange(requestedDirection);

        const moved = this.moveHorizontallyWhenDue(requestedDirection, map, collisionProbe);

        if (moved) {
            this.advanceWalkingFrameWhenDue();
        }

        return Player.NO_MOVEMENT_DEATH;
    }

    /**
     * Cancels gameplay movement before debug free-move takes over.
     *
     * Without this reset, releasing a debug key during a jump or fall could
     * resume an old in-progress movement state from the new debug position.
     */
    cancelMovementForDebug(): void
    {
        this.cancelMovement();
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
     * Calculates the horizontal distance from Sid to a transition target.
     */
    getHorizontalDistanceFrom(targetX: number): number
    {
        return Math.round(this.sprite.x - targetX);
    }

    /**
     * Calculates the vertical distance from Sid to a transition target.
     */
    getVerticalDistanceFrom(targetY: number): number
    {
        return Math.round(this.sprite.y - targetY);
    }

    /**
     * Moves Sid horizontally during the automatic end-of-level transition.
     */
    moveBodyX(delta: number): void
    {
        this.cancelMovement();
        this.sprite.x += delta;
    }

    /**
     * Moves Sid vertically during the automatic end-of-level transition.
     */
    moveBodyY(delta: number): void
    {
        this.cancelMovement();
        this.sprite.y += delta;
    }

    /**
     * Snaps Sid to an exact X coordinate during level transitions.
     */
    setBodyX(x: number): void
    {
        this.cancelMovement();
        this.sprite.x = x;
    }

    /**
     * Snaps Sid to an exact Y coordinate during level transitions.
     */
    setBodyY(y: number): void
    {
        this.cancelMovement();
        this.sprite.y = y;
    }

    /**
     * Returns the top-left position used by the death animation sprite.
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
        // Death interrupts movement, but preserves deadlyFall so the death
        // sequence can choose the white falling-death sprite.
        this.horizontalMovementAccumulator = 1;
        this.verticalMovementAccumulator = 1;
        this.slideMovementAccumulator = 1;
        this.jumpStepAccumulator = 1;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.stopWalk(false);
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
     * Returns the narrow rectangle used for key collection.
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
     * Returns the rectangle used for deadly tile checks.
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
     * Returns the body rectangle used by exit and monster checks.
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

    private cancelMovement(): void
    {
        this.horizontalMovementAccumulator = 1;
        this.verticalMovementAccumulator = 1;
        this.slideMovementAccumulator = 1;
        this.ladderMovementAccumulator = 1;
        this.jumpStepAccumulator = 1;
        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpHorizontalDirection = null;
        this.fallHeight = 0;
        this.deadlyFall = false;
        this.sprite.setTexture(this.normalTextureKey, this.firstFrameFor(this.facingDirection));
        this.stopWalk(false);
    }

    private readHorizontalDirection(inputState: PlayerInputState): FacingDirection | null
    {
        if (inputState.left) {
            return "left";
        }

        if (inputState.right) {
            return "right";
        }

        return null;
    }

    private isJumpRequested(inputState: PlayerInputState): boolean
    {
        return inputState.jump;
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

        // Landing keeps the current visual frame instead of snapping to idle.
        this.stopWalk(false);
    }

    private applyDirectionChange(direction: FacingDirection): void
    {
        if (this.facingDirection === direction) {
            return;
        }

        // Restart the frame sequence when the player turns around. Left and right
        // are separate frame ranges, not a mirrored sprite.
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
            // A slide forces movement while left/right input still owns the
            // walking animation direction. Opposite input can cancel the feeling
            // of the slope without changing which way Sid is facing.
            this.applyDirectionChange(requestedDirection);
        }

        if (!this.shouldMoveOnSlideThisFrame()) {
            return;
        }

        // Slides apply one diagonal step as a single environment decision. Using
        // separate horizontal and vertical timers makes slope cadence drift.
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
        // opposite arrow cancels the belt movement.
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
        this.moveUpOnLadderWhenDue(map, collisionProbe);

        if (!requestedDirection) {
            // Ladders move Sid upward automatically, but the player animation
            // stays on its current frame unless left/right input is also held.
            return;
        }

        this.applyDirectionChange(requestedDirection);
        const movedHorizontally = this.moveHorizontallyWhenDue(requestedDirection, map, collisionProbe);

        if (movedHorizontally) {
            // Match normal walking cadence while Sid crosses a ladder. Vertical
            // ladder movement alone must not spin the walking frames.
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

        // Use one-pixel steps because wall probes are pixel-precise, not velocity
        // based.
        const deltaX = direction === "right" ? 1 : -1;

        // Keep the sprite inside the imported map. Tile probes detect walls, but
        // the outer map edge is just a world boundary.
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
        // Once a fall is deadly, controls stay suspended and Sid keeps dropping
        // until his feet reach the top of the next solid tile. Use the normal
        // falling timer so the white fall does not suddenly accelerate.
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

    private moveUpOnLadderWhenDue(map: Tilemaps.Tilemap, collisionProbe: TileCollisionProbe): boolean
    {
        if (!this.shouldMoveOnLadderThisFrame()) {
            return false;
        }

        return this.moveUpByOnePixel(map, collisionProbe);
    }

    private moveDownByOnePixel(map: Tilemaps.Tilemap): boolean
    {
        // The clamp prevents falling outside the map data.
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

        // The jump path moves in one-pixel steps. The map clamp prevents Sid from
        // leaving the Tiled world at the top edge.
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

        // The side probe ignores the very top and bottom of the sprite so visual
        // padding does not behave like a hard collision box.
        return collisionProbe.hasWallOnVerticalLine(
            this.sprite.y + Player.SIDE_WALL_TOP_OFFSET,
            this.sprite.y + this.sprite.displayHeight - Player.SIDE_WALL_BOTTOM_OFFSET,
            probeX
        );
    }

    private isBlockedAbove(collisionProbe: TileCollisionProbe): boolean
    {
        // Ceiling checks reuse the narrow foot span. Testing the full sprite
        // width would make jumps hit ceilings too early.
        return collisionProbe.hasWallOnHorizontalLine(
            this.sprite.x + Player.FOOT_LEFT_OFFSET,
            this.sprite.x + Player.FOOT_RIGHT_OFFSET,
            this.sprite.y + Player.WALL_ABOVE_Y_OFFSET
        );
    }

    private hasSolidGroundBelow(collisionProbe: TileCollisionProbe): boolean
    {
        // The foot probe is deliberately narrower than the visible sprite so Sid
        // can stand close to platform edges.
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
        // A jump can land on solid tiles, slide tiles and visible vanishing
        // platforms. Without these extra checks, some level jumps become
        // immediate falls.
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
        // Deadly falls stop only on solid tile tops. Slides and vanishing
        // platforms deliberately do not end the falling-death sequence.
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

        // Conveyors are detected exactly on the foot line. Unlike slides, they do
        // not use the lower slope probe offset.
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
        this.stopWalk(false);

        // The normal sprite turns white during the uncontrollable falling part,
        // then the death sequence switches to the white dying spritesheet.
        this.sprite.setTexture(this.deadlyFallTextureKey, this.framesFor(this.facingDirection)[this.animationFrameIndex]);
    }

    private shouldMoveHorizontallyThisFrame(): boolean
    {
        // Keep walking slower than one pixel every update. The accumulator also
        // makes the cadence independent from other movement systems.
        this.horizontalMovementAccumulator += 1 / Player.MOVE_FRAME_INTERVAL;

        if (this.horizontalMovementAccumulator < 1) {
            return false;
        }

        this.horizontalMovementAccumulator -= 1;
        return true;
    }

    private shouldMoveVerticallyThisFrame(): boolean
    {
        // Use the same accumulator pattern as horizontal movement so falling and
        // walking stay visually comparable.
        this.verticalMovementAccumulator += 1 / Player.MOVE_FRAME_INTERVAL;

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
        this.slideMovementAccumulator += 1 / Player.MOVE_FRAME_INTERVAL;

        if (this.slideMovementAccumulator < 1) {
            return false;
        }

        this.slideMovementAccumulator -= 1;
        return true;
    }

    private shouldMoveOnLadderThisFrame(): boolean
    {
        // Ladders move Sid automatically, but not every update. Keeping a separate
        // timer avoids the previous bug where the ladder reset the fall timer and
        // climbed at full frame speed.
        this.ladderMovementAccumulator += 1 / Player.MOVE_FRAME_INTERVAL;

        if (this.ladderMovementAccumulator < 1) {
            return false;
        }

        this.ladderMovementAccumulator -= 1;
        return true;
    }

    private shouldAdvanceJumpThisFrame(): boolean
    {
        // Jump steps use the same movement cadence as walking and falling.
        this.jumpStepAccumulator += 1 / Player.MOVE_FRAME_INTERVAL;

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

    private stopWalk(resetHorizontalMovement = true): void
    {
        if (resetHorizontalMovement) {
            this.horizontalMovementAccumulator = 1;
        }

        // Do not reset to an idle frame here: stopping movement keeps the last
        // walking frame visible.
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
