import { PlayerStates } from "./playerStates.ts";
import type { PlayerAnimationName, PlayerDirection } from "./playerStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { CollisionDetector } from "./collisionDetector.ts";
import type { MovementDirection, PlayerController } from "./player.ts";

export interface PlayerMovementResult {
    x: number;
    y: number;
    checkInteractions: boolean;
    playerKilled: boolean;
}

/**
 * PlayerMovement owns the frame-by-frame movement rules for Slippery Sid.
 *
 * The code is intentionally close to the original Player.update() logic. Most
 * collision probes still use hard-coded pixel offsets because these values define
 * the actual feel of the old platforming behavior: how close the player can get
 * to walls, when a jump starts falling, when a landing is detected, and when a
 * fall becomes deadly.
 *
 * This object does not handle gameplay interactions such as collecting keys,
 * touching deadly tiles, touching monsters, or reaching the exit. Those checks
 * remain in PlayerInteractions. This separation lets PlayerMovement focus only
 * on deciding the player's next one-pixel movement for the current frame.
 */
export class PlayerMovementController
{
    // Horizontal foot probes. These are used to test the tiles below the player.
    // They intentionally do not span the full sprite width, so the player can
    // stand near edges without instantly falling.
    private readonly FOOT_LEFT_OFFSET = 7;
    private readonly FOOT_RIGHT_OFFSET = 23;

    // Slides are detected slightly below the feet so the player starts following
    // the slope only when already standing on it.
    private readonly SLIDE_PROBE_Y_OFFSET = 14;

    // Ladder detection uses a small rectangle around the lower part of the
    // player. This makes ladders feel forgiving without allowing climbing from
    // too far away.
    private readonly LADDER_LEFT_OFFSET = 7;
    private readonly LADDER_RIGHT_OFFSET = 23;
    private readonly LADDER_TOP_FROM_BOTTOM_OFFSET = 18;
    private readonly LADDER_BOTTOM_FROM_BOTTOM_OFFSET = 1;

    // Wall probes. The side probes are narrower than the sprite to preserve the
    // original movement tolerance around corners.
    private readonly WALL_ABOVE_Y_OFFSET = -2;
    private readonly RIGHT_WALL_X_OFFSET = 24;
    private readonly LEFT_WALL_X_OFFSET = 5;
    private readonly SIDE_WALL_TOP_OFFSET = 6;
    private readonly SIDE_WALL_BOTTOM_OFFSET = 1;

    // The remake moves the player one pixel per frame. Jump movement comes from
    // Data.jumpPath, but horizontal/vertical application still happens in one-
    // pixel increments.
    private readonly MOVE_STEP = 1;

    // Data.jumpPath starts with the rising part of the jump. Once this index is
    // reached, the player is considered to be falling and fall height starts to
    // count again.
    private readonly JUMP_FALL_START_INDEX = 50;

    /**
     * Updates movement for one frame.
     *
     * The returned coordinates are the coordinates captured at the beginning of
     * the frame. PlayerInteractions intentionally uses these original coordinates
     * to preserve the collision timing of the pre-refactoring implementation.
     *
     * @param {object} player The global Player object.
     * @returns {{x: number, y: number, checkInteractions: boolean, playerKilled: boolean}}
     */
    public update(player: PlayerController): PlayerMovementResult
    {
        const direction: MovementDirection = {
            horizontal : null,
            vertical : null
        };

        const startPosition = {
            x : player.getBodyX(),
            y : player.getBodyY()
        };

        // During a deadly fall, normal controls and interactions are suspended.
        // The player simply keeps falling until a solid tile is reached, then the
        // caller reports the death to the game flow owner.
        if (player.isDeadlyFall())
        {
            const playerKilled = this.updateDeadlyFall(player, startPosition.x, startPosition.y);
            return {
                x : startPosition.x,
                y : startPosition.y,
                checkInteractions : false,
                playerKilled : playerKilled
            };
        }

        // Ground input is accepted only when the player is not already falling or
        // jumping. This preserves the old rigid platformer feel.
        if (player.canAcceptGroundInput())
            this.handleGroundInput(player, direction);

        if (player.isJumping())
            this.updateJump(player, direction, startPosition.x, startPosition.y);

        if (player.isJumping() == false)
            this.updateGroundAndEnvironment(player, direction, startPosition.x, startPosition.y);

        this.blockInvalidMovement(player, direction, startPosition.x, startPosition.y);
        this.applyMovement(player, direction);

        return {
            x : startPosition.x,
            y : startPosition.y,
            checkInteractions : true,
            playerKilled : false
        };
    }

    /**
     * Handles the special falling state used after the player has fallen too far.
     *
     * A deadly fall cannot be cancelled by input. When the player eventually hits
     * solid ground, the caller is told that the player should die. PlayerMovement
     * does not start the death sequence itself; GameController owns that flow.
     */
    private updateDeadlyFall(player: PlayerController, x: number, y: number): boolean
    {
        player.moveBodyY(this.MOVE_STEP);

        if (this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, true))
        {
            player.resetFallHeight();
            return true;
        }

        return false;
    }

    /**
     * Reads jump and horizontal movement input while the player is on stable
     * ground. Jump direction is remembered at jump start so the player keeps the
     * same horizontal impulse during the jump path.
     */
    private handleGroundInput(player: PlayerController, direction: MovementDirection): void
    {
        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR))
        {
            player.startJump();
        }

        if (keyPressed.right.isDown)
        {
            player.rememberJumpDirection(PlayerStates.RIGHT);

            direction.horizontal = PlayerStates.RIGHT;
            this.resetAnimationIfChangingDirection(player, PlayerStates.ANIMATION_LEFT, PlayerStates.ANIMATION_RIGHT);
            player.playRight();
        }

        if (keyPressed.left.isDown)
        {
            player.rememberJumpDirection(PlayerStates.LEFT);

            direction.horizontal = PlayerStates.LEFT;
            this.resetAnimationIfChangingDirection(player, PlayerStates.ANIMATION_RIGHT, PlayerStates.ANIMATION_LEFT);
            player.playLeft();
        }
    }

    /**
     * Resets the walking animation when the player changes horizontal direction.
     *
     * Without this reset, switching from one direction to the other can keep the
     * previous animation frame/counter and make the first frame look wrong.
     */
    private resetAnimationIfChangingDirection(player: PlayerController, previousAnimation: PlayerAnimationName, newAnimation: PlayerAnimationName): void
    {
        player.resetAnimationIfChangingDirection(previousAnimation, newAnimation);
    }

    /**
     * Advances the jump path and decides whether the player has landed.
     *
     * Data.jumpPath controls both the vertical path and whether horizontal motion
     * is allowed for each jump frame. The falling part of the jump starts at
     * JUMP_FALL_START_INDEX, at which point fallHeight is counted so a very long
     * drop after a jump can still become deadly.
     */
    private updateJump(player: PlayerController, direction: MovementDirection, x: number, y: number): void
    {
        player.playJumpDirectionAnimation();
        player.advanceJumpFrame();

        if (player.hasJumpReachedFallingSection(this.JUMP_FALL_START_INDEX))
        {
            player.increaseFallHeight();

            if (this.isLandingAfterJump(player, x, y))
            {
                player.landFromJump();
            }
            else if (player.hasReachedFallLimit())
            {
                this.startDeadlyFall(player);
            }
        }

        if (player.isJumping())
            player.applyCurrentJumpPathFrame(direction);
    }

    /**
     * Applies environment-driven movement when the player is not jumping.
     *
     * This includes slides, falling, conveyors, ladders, and stopping the walking
     * animation when no horizontal key is pressed.
     */
    private updateGroundAndEnvironment(player: PlayerController, direction: MovementDirection, x: number, y: number): void
    {
        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_LEFT_SLIDE, this.SLIDE_PROBE_Y_OFFSET))
        {
            direction.horizontal = PlayerStates.LEFT;
            direction.vertical = PlayerStates.DOWN;
            player.resetFallHeight();
        }

        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_RIGHT_SLIDE, this.SLIDE_PROBE_Y_OFFSET))
        {
            direction.horizontal = PlayerStates.RIGHT;
            direction.vertical = PlayerStates.DOWN;
            player.resetFallHeight();
        }

        if (direction.vertical == null)
            this.updateFalling(player, direction, x, y);

        this.applyConveyorBelts(player, direction, x, y);

        if (this.isOnLadder(player, x, y))
            direction.vertical = PlayerStates.UP;

        if (keyPressed.left.isUp && keyPressed.right.isUp)
            player.stopAnimation();
    }

    /**
     * Starts or continues normal falling when there is no ground below.
     *
     * Vanishing platforms are treated as temporary ground while their sprite still
     * collides with the player's foot line.
     */
    private updateFalling(player: PlayerController, direction: MovementDirection, x: number, y: number): void
    {
        if (this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, false) == false &&
            CollisionDetector.collisionLineWithVanishingPlatform(
                x + this.FOOT_LEFT_OFFSET,
                x + this.FOOT_RIGHT_OFFSET,
                y + player.getBodyHeight()) == false)
        {
            direction.vertical = PlayerStates.DOWN;
            direction.horizontal = null;
            player.stopAnimation();

            player.increaseFallHeight();

            if (player.hasReachedFallLimit())
                this.startDeadlyFall(player);
        }
        else
        {
            player.resetFallHeight();
        }
    }

    /**
     * Applies conveyor belt movement.
     *
     * Walking against a conveyor cancels horizontal movement for the frame. Not
     * pressing against it makes the conveyor move the player automatically.
     */
    private applyConveyorBelts(player: PlayerController, direction: MovementDirection, x: number, y: number): void
    {
        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_CONVEYOR_RIGHT, 0))
        {
            if (direction.horizontal == PlayerStates.LEFT)
                direction.horizontal = null;
            else
                direction.horizontal = PlayerStates.RIGHT;
        }

        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_CONVEYOR_LEFT, 0))
        {
            if (direction.horizontal == PlayerStates.RIGHT)
                direction.horizontal = null;
            else
                direction.horizontal = PlayerStates.LEFT;
        }
    }

    /**
     * Cancels movement that would enter a blocking wall tile.
     *
     * Movement is decided first, then validated here. This keeps input handling,
     * environment effects, and collision blocking separated while preserving the
     * original one-pixel movement style.
     */
    private blockInvalidMovement(player: PlayerController, direction: MovementDirection, x: number, y: number): void
    {
        if (direction.vertical == PlayerStates.UP &&
            CollisionDetector.horizontalCollisionLine(
                x + this.FOOT_LEFT_OFFSET,
                x + this.FOOT_RIGHT_OFFSET,
                y + this.WALL_ABOVE_Y_OFFSET,
                LevelConstants.TILED_PROPERTY_NAME,
                LevelConstants.TILE_NAME_WALL))
        {
            direction.vertical = null;
        }

        if (direction.horizontal == PlayerStates.RIGHT &&
            CollisionDetector.verticalCollisionLine(
                y + this.SIDE_WALL_TOP_OFFSET,
                y + player.getBodyHeight() - this.SIDE_WALL_BOTTOM_OFFSET,
                x + this.RIGHT_WALL_X_OFFSET,
                LevelConstants.TILED_PROPERTY_NAME,
                LevelConstants.TILE_NAME_WALL,
                false))
        {
            direction.horizontal = null;
        }

        if (direction.horizontal == PlayerStates.LEFT &&
            CollisionDetector.verticalCollisionLine(
                y + this.SIDE_WALL_TOP_OFFSET,
                y + player.getBodyHeight() - this.SIDE_WALL_BOTTOM_OFFSET,
                x + this.LEFT_WALL_X_OFFSET,
                LevelConstants.TILED_PROPERTY_NAME,
                LevelConstants.TILE_NAME_WALL,
                false))
        {
            direction.horizontal = null;
        }
    }

    /**
     * Applies the final one-pixel movement selected for this frame.
     */
    private applyMovement(player: PlayerController, direction: MovementDirection): void
    {
        if (direction.horizontal == PlayerStates.RIGHT)
            player.moveBodyX(this.MOVE_STEP);

        if (direction.horizontal == PlayerStates.LEFT)
            player.moveBodyX(-this.MOVE_STEP);

        if (direction.vertical == PlayerStates.DOWN)
            player.moveBodyY(this.MOVE_STEP);

        if (direction.vertical == PlayerStates.UP)
            player.moveBodyY(-this.MOVE_STEP);
    }

    /**
     * Checks whether the player has landed during the falling part of a jump.
     *
     * Landing can happen on a solid tile, a slide tile, or a vanishing platform.
     */
    private isLandingAfterJump(player: PlayerController, x: number, y: number): boolean
    {
        return this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, true) ||
            this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SLIDE, true) ||
            CollisionDetector.collisionLineWithVanishingPlatform(
                x + this.FOOT_LEFT_OFFSET,
                x + this.FOOT_RIGHT_OFFSET,
                y + player.getBodyHeight());
    }

    /**
     * Tests the short horizontal foot line against tiles of a given type.
     */
    private hasGroundBelow(player: PlayerController, x: number, y: number, tileType: string, onTop: boolean): boolean
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.getBodyHeight(),
            LevelConstants.TILED_PROPERTY_TYPE,
            tileType,
            onTop);
    }

    /**
     * Tests whether the player is standing on a tile with a specific Tiled name.
     */
    private isOnTileByName(player: PlayerController, x: number, y: number, tileName: string, yOffset: number): boolean
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.getBodyHeight() + yOffset,
            LevelConstants.TILED_PROPERTY_NAME,
            tileName,
            false);
    }

    /**
     * Checks the small rectangle used for ladder climbing.
     *
     * The rectangle is intentionally located near the player's feet/body rather
     * than covering the full sprite. This reproduces the existing ladder behavior.
     */
    private isOnLadder(player: PlayerController, x: number, y: number): boolean
    {
        return CollisionDetector.collisionRectangle(
            x + this.LADDER_LEFT_OFFSET,
            y + player.getBodyHeight() - this.LADDER_TOP_FROM_BOTTOM_OFFSET,
            x + this.LADDER_RIGHT_OFFSET,
            y + player.getBodyHeight() - this.LADDER_BOTTOM_FROM_BOTTOM_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_LADDER);
    }

    /**
     * Switches the player into the uncontrollable deadly-fall state.
     *
     * The white sprite is used only for this fall-to-death sequence, matching the
     * behavior of the original implementation.
     */
    private startDeadlyFall(player: PlayerController): void
    {
        player.startDeadlyFall();
    }
}

