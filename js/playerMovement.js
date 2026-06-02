/**
 * PlayerMovement owns the frame-by-frame movement rules for Slippery Sid.
 *
 * The code is intentionally close to the original Player.update() logic. The
 * exact collision probes have been moved to PlayerMovementProbes and tile-driven
 * movement effects have been moved to PlayerEnvironmentEffects, but the high-
 * level order is preserved here: read input, update jump/fall, block invalid
 * movement, then apply the final one-pixel movement.
 *
 * This object does not handle gameplay interactions such as collecting keys,
 * touching deadly tiles, touching monsters, or reaching the exit. Those checks
 * remain in PlayerInteractions.
 */
var PlayerMovement =
{
    // The remake moves the player one pixel per frame. Jump movement comes from
    // Data.jumpPath, but horizontal/vertical application still happens in one-
    // pixel increments.
    MOVE_STEP : 1,

    // Data.jumpPath starts with the rising part of the jump. Once this index is
    // reached, the player is considered to be falling and fall height starts to
    // count again.
    JUMP_FALL_START_INDEX : 50,

    /**
     * Updates movement for one frame.
     *
     * The returned coordinates are the coordinates captured at the beginning of
     * the frame. PlayerInteractions intentionally uses these original coordinates
     * to preserve the collision timing of the pre-refactoring implementation.
     *
     * @param {object} player The global Player object.
     * @returns {{x: number, y: number, checkInteractions: boolean}}
     */
    update : function(player)
    {
        var direction = {
            horizontal : null,
            vertical : null
        };

        var startPosition = {
            x : player.playerSprite.body.x,
            y : player.playerSprite.body.y
        };

        // During a deadly fall, normal controls and interactions are suspended.
        // The player simply keeps falling until a solid tile is reached, then the
        // death sequence starts.
        if (player.deadlyFall)
        {
            this.updateDeadlyFall(player, startPosition.x, startPosition.y);
            return {
                x : startPosition.x,
                y : startPosition.y,
                checkInteractions : false
            };
        }

        // Ground input is accepted only when the player is not already falling or
        // jumping. This preserves the old rigid platformer feel.
        if (player.fallHeight == 0 && player.jumping == false)
            this.handleGroundInput(player, direction);

        if (player.jumping)
            this.updateJump(player, direction, startPosition.x, startPosition.y);

        if (player.jumping == false)
            PlayerEnvironmentEffects.update(player, direction, startPosition.x, startPosition.y);

        this.blockInvalidMovement(player, direction, startPosition.x, startPosition.y);
        this.applyMovement(player, direction);

        return {
            x : startPosition.x,
            y : startPosition.y,
            checkInteractions : true
        };
    },

    /**
     * Handles the special falling state used after the player has fallen too far.
     *
     * A deadly fall cannot be cancelled by input. When the player eventually hits
     * solid ground, Player.kill() is called and the death animation uses the
     * white falling sprite.
     */
    updateDeadlyFall : function(player, x, y)
    {
        player.playerSprite.body.y += this.MOVE_STEP;

        if (PlayerMovementProbes.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, true))
        {
            player.fallHeight = 0;
            player.kill();
        }
    },

    /**
     * Reads jump and horizontal movement input while the player is on stable
     * ground. Jump direction is remembered at jump start so the player keeps the
     * same horizontal impulse during the jump path.
     */
    handleGroundInput : function(player, direction)
    {
        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR))
        {
            player.jumping = true;
            player.jumpIndex = 0;
            player.jumpingDirection = null;
        }

        if (keyPressed.right.isDown)
        {
            if (player.jumping)
                player.jumpingDirection = PlayerStates.RIGHT;

            direction.horizontal = PlayerStates.RIGHT;
            this.resetAnimationIfChangingDirection(player, PlayerStates.ANIMATION_LEFT, PlayerStates.ANIMATION_RIGHT);
            player.playRight();
        }

        if (keyPressed.left.isDown)
        {
            if (player.jumping)
                player.jumpingDirection = PlayerStates.LEFT;

            direction.horizontal = PlayerStates.LEFT;
            this.resetAnimationIfChangingDirection(player, PlayerStates.ANIMATION_RIGHT, PlayerStates.ANIMATION_LEFT);
            player.playLeft();
        }
    },

    /**
     * Resets the walking animation when the player changes horizontal direction.
     *
     * Without this reset, switching from one direction to the other can keep the
     * previous animation frame/counter and make the first frame look wrong.
     */
    resetAnimationIfChangingDirection : function(player, previousAnimation, newAnimation)
    {
        if (player.playerSprite.animations.currentAnim.name == previousAnimation)
        {
            player.playerSprite.animations.play(newAnimation);
            player.playerSprite.animations.stop();

            if (newAnimation == PlayerStates.ANIMATION_RIGHT)
                player.animationRightCounter = player.animationMaxCounter;
            else
                player.animationLeftCounter = player.animationMaxCounter;
        }
    },

    /**
     * Advances the jump path and decides whether the player has landed.
     *
     * Data.jumpPath controls both the vertical path and whether horizontal motion
     * is allowed for each jump frame. The falling part of the jump starts at
     * JUMP_FALL_START_INDEX, at which point fallHeight is counted so a very long
     * drop after a jump can still become deadly.
     */
    updateJump : function(player, direction, x, y)
    {
        if (player.jumpingDirection == PlayerStates.LEFT)
            player.playLeft();

        if (player.jumpingDirection == PlayerStates.RIGHT)
            player.playRight();

        player.jumpIndex += 1;

        if (player.jumpIndex >= this.JUMP_FALL_START_INDEX)
        {
            player.fallHeight += 1;

            if (PlayerMovementProbes.isLandingAfterJump(player, x, y))
            {
                player.jumping = false;
                player.fallHeight = 0;
                player.playerSprite.animations.stop();
            }
            else if (player.fallHeight == player.fallLimit)
            {
                PlayerEnvironmentEffects.startDeadlyFall(player);
            }
        }

        if (player.jumping == true)
        {
            direction.vertical = Data.jumpPath[player.jumpIndex][1];

            if (Data.jumpPath[player.jumpIndex][0] == false)
                direction.horizontal = null;
            else
                direction.horizontal = player.jumpingDirection;

            if (player.jumpIndex >= Data.jumpPath.length - 1)
                player.jumping = false;
        }
    },

    /**
     * Cancels movement that would enter a blocking wall tile.
     *
     * Movement is decided first, then validated here. This keeps input handling,
     * environment effects, and collision blocking separated while preserving the
     * original one-pixel movement style.
     */
    blockInvalidMovement : function(player, direction, x, y)
    {
        if (direction.vertical == PlayerStates.UP && PlayerMovementProbes.isBlockedAbove(player, x, y))
            direction.vertical = null;

        if (direction.horizontal == PlayerStates.RIGHT && PlayerMovementProbes.isBlockedRight(player, x, y))
            direction.horizontal = null;

        if (direction.horizontal == PlayerStates.LEFT && PlayerMovementProbes.isBlockedLeft(player, x, y))
            direction.horizontal = null;
    },

    /**
     * Applies the final one-pixel movement selected for this frame.
     */
    applyMovement : function(player, direction)
    {
        if (direction.horizontal == PlayerStates.RIGHT)
            player.playerSprite.body.x += this.MOVE_STEP;

        if (direction.horizontal == PlayerStates.LEFT)
            player.playerSprite.body.x -= this.MOVE_STEP;

        if (direction.vertical == PlayerStates.DOWN)
            player.playerSprite.body.y += this.MOVE_STEP;

        if (direction.vertical == PlayerStates.UP)
            player.playerSprite.body.y -= this.MOVE_STEP;
    }
};
