/**
 * PlayerEnvironmentEffects applies movement caused by the current tiles.
 *
 * This object owns the rules for slides, falling, conveyor belts and ladders.
 * PlayerMovement still decides the high-level frame flow, while this helper
 * adjusts the requested direction according to the environment under the player.
 */
var PlayerEnvironmentEffects =
{
    /**
     * Applies all non-jump environment effects for one frame.
     */
    update : function(player, direction, x, y)
    {
        this.applySlides(player, direction, x, y);

        if (direction.vertical == null)
            this.updateFalling(player, direction, x, y);

        this.applyConveyorBelts(player, direction, x, y);

        if (PlayerMovementProbes.isOnLadder(player, x, y))
            direction.vertical = PlayerStates.UP;

        if (keyPressed.left.isUp && keyPressed.right.isUp)
            player.playerSprite.animations.stop();
    },

    /**
     * Slides move the player diagonally down the slope and reset fall height.
     */
    applySlides : function(player, direction, x, y)
    {
        if (PlayerMovementProbes.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_LEFT_SLIDE, PlayerMovementProbes.SLIDE_PROBE_Y_OFFSET))
        {
            direction.horizontal = PlayerStates.LEFT;
            direction.vertical = PlayerStates.DOWN;
            player.fallHeight = 0;
        }

        if (PlayerMovementProbes.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_RIGHT_SLIDE, PlayerMovementProbes.SLIDE_PROBE_Y_OFFSET))
        {
            direction.horizontal = PlayerStates.RIGHT;
            direction.vertical = PlayerStates.DOWN;
            player.fallHeight = 0;
        }
    },

    /**
     * Starts or continues normal falling when there is no ground below.
     *
     * Vanishing platforms are treated as temporary ground while their sprite still
     * collides with the player's foot line.
     */
    updateFalling : function(player, direction, x, y)
    {
        if (PlayerMovementProbes.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, false) == false &&
            PlayerMovementProbes.hasVanishingPlatformBelow(player, x, y) == false)
        {
            direction.vertical = PlayerStates.DOWN;
            direction.horizontal = null;
            player.playerSprite.animations.stop();

            player.fallHeight += 1;

            if (player.fallHeight == player.fallLimit)
                this.startDeadlyFall(player);
        }
        else
        {
            player.fallHeight = 0;
        }
    },

    /**
     * Applies conveyor belt movement.
     *
     * Walking against a conveyor cancels horizontal movement for the frame. Not
     * pressing against it makes the conveyor move the player automatically.
     */
    applyConveyorBelts : function(player, direction, x, y)
    {
        if (PlayerMovementProbes.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_CONVEYOR_RIGHT, 0))
        {
            if (direction.horizontal == PlayerStates.LEFT)
                direction.horizontal = null;
            else
                direction.horizontal = PlayerStates.RIGHT;
        }

        if (PlayerMovementProbes.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_CONVEYOR_LEFT, 0))
        {
            if (direction.horizontal == PlayerStates.RIGHT)
                direction.horizontal = null;
            else
                direction.horizontal = PlayerStates.LEFT;
        }
    },

    /**
     * Switches the player into the uncontrollable deadly-fall state.
     *
     * The white sprite is used only for this fall-to-death sequence, matching the
     * behavior of the original implementation.
     */
    startDeadlyFall : function(player)
    {
        player.deadlyFall = true;
        player.playerSprite.loadTexture(PlayerStates.SPRITE_BLAGGER_WHITE, player.playerSprite.animations.currentAnim.frame);
    }
};
