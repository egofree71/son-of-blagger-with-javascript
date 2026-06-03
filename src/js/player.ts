import { GameStates } from "./gameStates.ts";
import { PlayerStates } from "./playerStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { Util } from "./util.ts";
import { PlayerMovement } from "./playerMovement.ts";
import { PlayerInteractions } from "./playerInteractions.ts";
import { PlayerDeathSequence } from "./playerDeathSequence.ts";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";
import type { PlayerDirection } from "./playerStates.ts";

/**
 * Owns the playable character sprite and player-specific runtime state.
 *
 * The exported Player value remains a singleton so existing callers can keep
 * using Player.create(), Player.reset(), Player.update(), and Player.kill(). The
 * class only replaces the previous object-literal container; movement rules,
 * interaction checks, animation timings, and death handling still live in their
 * dedicated modules.
 */
export class PlayerController
{
    // Shows if the player is jumping.
    public jumping: boolean = false;

    // The index in the jump animation.
    public jumpIndex: number = 0;

    // Shows the horizontal direction of the jump.
    public jumpingDirection: PlayerDirection | null = null;

    // When player is falling, store the fall height.
    public fallHeight: number = 0;

    // If the player exceeds this limit, the fall is deadly.
    public fallLimit: number = 72;

    public deadlyFall: boolean = false;

    public playerSprite: any = null;
    public playerDyingSprite: any = null;

    public animationMaxCounter: number = 5;
    public animationLeftCounter: number = 0;
    public animationRightCounter: number = 0;

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
    public reset(): void
    {
        // Find player's position for the current level.
        const results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, Level.level, LevelConstants.OBJECT_LAYER_PLAYER);

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

    public update(): void
    {
        if (GameController.gameState != GameStates.PLAYING) return;

        const movementResult = PlayerMovement.update(this);

        if (movementResult.checkInteractions)
            PlayerInteractions.update(this, movementResult.x, movementResult.y);
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
     * When the player is killed, delegate the death animation and life handling.
     */
    public kill(): void
    {
        PlayerDeathSequence.start(this);
    }
}

export const Player = new PlayerController();
