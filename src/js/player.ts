import { PlayerStates } from "./playerStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { Util } from "./util.ts";
import { Data } from "./data.ts";
import type { PlayerMovementController } from "./playerMovement.ts";
import type { PlayerInteractionsController, PlayerInteractionContext, PlayerInteractionResult } from "./playerInteractions.ts";
import type { PlayerDeathSequenceController } from "./playerDeathSequence.ts";
import type { PlayerAnimationName, PlayerDirection } from "./playerStates.ts";

/**
 * Owns the playable character sprite and player-specific runtime state.
 *
 * PlayerController is instantiated by GameRuntime and receives its specialized
 * player subsystems through the constructor. Movement rules, interaction checks,
 * animation timings, and death handling still live in their dedicated modules.
 */
export interface MovementDirection {
    horizontal: PlayerDirection | null;
    vertical: PlayerDirection | null;
}

export class PlayerController
{
    constructor(
        private readonly playerMovement: PlayerMovementController,
        private readonly playerInteractions: PlayerInteractionsController,
        private readonly playerDeathSequence: PlayerDeathSequenceController
    )
    {
    }

    // Shows if the player is jumping.
    private jumping: boolean = false;

    // The index in the jump animation.
    private jumpIndex: number = 0;

    // Shows the horizontal direction of the jump.
    private jumpingDirection: PlayerDirection | null = null;

    // When player is falling, store the fall height.
    private fallHeight: number = 0;

    // If the player exceeds this limit, the fall is deadly.
    private readonly fallLimit: number = 72;

    private deadlyFall: boolean = false;

    private playerSprite: any = null;
    private playerDyingSprite: any = null;

    private readonly animationMaxCounter: number = 5;
    private animationLeftCounter: number = 0;
    private animationRightCounter: number = 0;

    public create(): void
    {
        // Create the playerSprite.
        this.playerSprite = game.add.sprite(0, 0, PlayerStates.SPRITE_BLAGGER);
        game.physics.arcade.enable(this.playerSprite);

        // Set the animations for the player.
        this.playerSprite.animations.add(PlayerStates.ANIMATION_RIGHT, [6, 7, 8, 9, 10, 11], 10, true);
        this.playerSprite.animations.add(PlayerStates.ANIMATION_LEFT, [0, 1, 2, 3, 4, 5], 10, true);
    }

    /**
     * Resets player's properties at the beginning of a level.
     */
    public reset(levelNumber: number): void
    {
        // Find player's position for the current level.
        const results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, levelNumber, LevelConstants.OBJECT_LAYER_PLAYER);

        this.playerSprite.reset(results[0].x, results[0].y - LevelConstants.PLAYER_TILED_Y_OFFSET);
        this.playerSprite.loadTexture(PlayerStates.SPRITE_BLAGGER);
        this.playerSprite.animations.play(PlayerStates.ANIMATION_RIGHT);
        this.playerSprite.animations.stop();

        game.camera.follow(this.playerSprite);

        this.animationLeftCounter = this.animationMaxCounter;
        this.animationRightCounter = this.animationMaxCounter;

        this.jumping = false;
        this.jumpIndex = 0;
        this.jumpingDirection = null;
        this.deadlyFall = false;

        this.fallHeight = 0;
    }

    public update(interactionContext: PlayerInteractionContext): PlayerInteractionResult
    {
        const movementResult = this.playerMovement.update(this);

        if (movementResult.playerKilled)
        {
            return {
                keyCollected: false,
                playerKilled: true,
                exitReached: false
            };
        }

        if (movementResult.checkInteractions)
            return this.playerInteractions.update(this, movementResult.x, movementResult.y, interactionContext);

        return {
            keyCollected: false,
            playerKilled: false,
            exitReached: false
        };
    }

    /**
     * Displays player going left.
     */
    public playLeft(): void
    {
        this.animationLeftCounter -= 1;

        if (this.animationLeftCounter == 0)
        {
            this.animationLeftCounter = this.animationMaxCounter;
            this.playerSprite.animations.getAnimation(PlayerStates.ANIMATION_LEFT).next();
        }
    }

    /**
     * Displays player going right.
     */
    public playRight(): void
    {
        this.animationRightCounter -= 1;

        if (this.animationRightCounter == 0)
        {
            this.animationRightCounter = this.animationMaxCounter;
            this.playerSprite.animations.getAnimation(PlayerStates.ANIMATION_RIGHT).next();
        }
    }

    /**
     * Resets the walking animation when the player changes horizontal direction.
     */
    public resetAnimationIfChangingDirection(previousAnimation: PlayerAnimationName, newAnimation: PlayerAnimationName): void
    {
        if (this.playerSprite.animations.currentAnim.name == previousAnimation)
        {
            this.playerSprite.animations.play(newAnimation);
            this.playerSprite.animations.stop();

            if (newAnimation == PlayerStates.ANIMATION_RIGHT)
                this.animationRightCounter = this.animationMaxCounter;
            else
                this.animationLeftCounter = this.animationMaxCounter;
        }
    }

    /**
     * Stops the current player animation.
     */
    public stopAnimation(): void
    {
        this.playerSprite.animations.stop();
    }

    /**
     * Returns whether normal ground input may start a jump or horizontal move.
     */
    public canAcceptGroundInput(): boolean
    {
        return this.fallHeight == 0 && this.jumping == false;
    }

    /**
     * Starts a jump and clears the remembered horizontal jump impulse.
     */
    public startJump(): void
    {
        this.jumping = true;
        this.jumpIndex = 0;
        this.jumpingDirection = null;
    }

    /**
     * Remembers the horizontal impulse chosen at jump start.
     */
    public rememberJumpDirection(direction: PlayerDirection): void
    {
        if (this.jumping)
            this.jumpingDirection = direction;
    }

    /**
     * Returns whether the player is currently following the jump path.
     */
    public isJumping(): boolean
    {
        return this.jumping;
    }

    /**
     * Advances to the next frame in the jump path.
     */
    public advanceJumpFrame(): void
    {
        this.jumpIndex += 1;
    }

    /**
     * Returns whether the jump path has reached the falling section.
     */
    public hasJumpReachedFallingSection(firstFallingJumpIndex: number): boolean
    {
        return this.jumpIndex >= firstFallingJumpIndex;
    }

    /**
     * Applies the current jump path frame to the movement direction for this update.
     */
    public applyCurrentJumpPathFrame(direction: MovementDirection): void
    {
        direction.vertical = Data.jumpPath[this.jumpIndex][1];

        if (Data.jumpPath[this.jumpIndex][0] == false)
            direction.horizontal = null;
        else
            direction.horizontal = this.jumpingDirection;

        if (this.jumpIndex >= Data.jumpPath.length - 1)
            this.stopJumping();
    }

    /**
     * Plays the walking animation matching the remembered jump impulse.
     */
    public playJumpDirectionAnimation(): void
    {
        if (this.jumpingDirection == PlayerStates.LEFT)
            this.playLeft();

        if (this.jumpingDirection == PlayerStates.RIGHT)
            this.playRight();
    }

    /**
     * Stops jump movement without touching the accumulated fall height.
     */
    public stopJumping(): void
    {
        this.jumping = false;
    }

    /**
     * Stops jump movement after landing and clears the fall height.
     */
    public landFromJump(): void
    {
        this.jumping = false;
        this.resetFallHeight();
        this.stopAnimation();
    }

    /**
     * Clears the normal falling counter.
     */
    public resetFallHeight(): void
    {
        this.fallHeight = 0;
    }

    /**
     * Records one more frame of falling.
     */
    public increaseFallHeight(): void
    {
        this.fallHeight += 1;
    }

    /**
     * Returns whether the current fall has reached the deadly-fall threshold.
     */
    public hasReachedFallLimit(): boolean
    {
        return this.fallHeight == this.fallLimit;
    }

    /**
     * Switches the player into the uncontrollable deadly-fall state.
     */
    public startDeadlyFall(): void
    {
        this.deadlyFall = true;
        this.playerSprite.loadTexture(PlayerStates.SPRITE_BLAGGER_WHITE, this.playerSprite.animations.currentAnim.frame);
    }

    /**
     * Returns the current Phaser body X coordinate.
     */
    public getBodyX(): number
    {
        return this.playerSprite.body.x;
    }

    /**
     * Returns the current Phaser body Y coordinate.
     */
    public getBodyY(): number
    {
        return this.playerSprite.body.y;
    }

    /**
     * Returns the current Phaser body height.
     */
    public getBodyHeight(): number
    {
        return this.playerSprite.body.height;
    }

    /**
     * Calculates the horizontal distance from the player to a target X coordinate.
     */
    public getHorizontalDistanceFrom(targetX: number): number
    {
        return this.getBodyX() - targetX;
    }

    /**
     * Calculates the vertical distance from the player to a target Y coordinate.
     */
    public getVerticalDistanceFrom(targetY: number): number
    {
        return this.getBodyY() - targetY;
    }

    /**
     * Moves the Phaser body on the X axis.
     */
    public moveBodyX(delta: number): void
    {
        this.playerSprite.body.x += delta;
    }

    /**
     * Moves the Phaser body on the Y axis.
     */
    public moveBodyY(delta: number): void
    {
        this.playerSprite.body.y += delta;
    }

    /**
     * Snaps the Phaser body X coordinate to an exact value.
     */
    public setBodyX(x: number): void
    {
        this.playerSprite.body.x = x;
    }

    /**
     * Snaps the Phaser body Y coordinate to an exact value.
     */
    public setBodyY(y: number): void
    {
        this.playerSprite.body.y = y;
    }

    /**
     * Keeps the player sprite visually above the map and animated tile overlays.
     */
    public bringToTop(): void
    {
        this.playerSprite.bringToTop();
    }

    /**
     * Hides the normal player sprite while the death animation is playing.
     */
    public hideSprite(): void
    {
        this.playerSprite.visible = false;
    }

    /**
     * Tells whether the current death was caused by a deadly fall.
     */
    public isDeadlyFall(): boolean
    {
        return this.deadlyFall;
    }

    /**
     * Stores the temporary sprite used by the death animation.
     */
    public setDyingSprite(sprite: any): void
    {
        this.playerDyingSprite = sprite;
    }

    /**
     * Adds the death animation to the temporary death sprite and returns it.
     */
    public addDyingAnimation(): any
    {
        return this.playerDyingSprite.animations.add(PlayerStates.ANIMATION_BLAGGER_DYING);
    }

    /**
     * Starts the temporary death animation sprite.
     */
    public playDyingAnimation(): void
    {
        this.playerDyingSprite.animations.play(
            PlayerStates.ANIMATION_BLAGGER_DYING,
            PlayerStates.DYING_ANIMATION_FRAME_RATE,
            false,
            true);
    }

    /**
     * Starts the visual death animation.
     *
     * The caller owns the global gameplay consequences that happen when the
     * animation completes. This keeps Player and PlayerDeathSequence independent
     * from score, lives, HUD and level flow.
     */
    public kill(onComplete: () => void): void
    {
        this.playerDeathSequence.start(this, onComplete);
    }
}

