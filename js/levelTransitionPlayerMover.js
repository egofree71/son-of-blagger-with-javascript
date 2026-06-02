/**
 * Handles the player positioning work used during the end-level transition.
 *
 * LevelTransition owns the sequence phases, while this object owns the target
 * position and the movement rules needed to visually move the player from the
 * completed level to the next level start position.
 */
var LevelTransitionPlayerMover =
{
    nextPlayerPositionX : 0,
    nextPlayerPositionY : 0,

    reset : function()
    {
        this.nextPlayerPositionX = 0;
        this.nextPlayerPositionY = 0;
    },

    /**
     * Reads the next level player spawn position from the Tiled object layer.
     *
     * The vertical offset is preserved from the original implementation. Tiled
     * object coordinates and the Phaser player body do not use exactly the same
     * origin, so the Y value must be adjusted before being used as a body target.
     */
    captureTargetFromTiledMap : function(level)
    {
        var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, level, LevelConstants.OBJECT_LAYER_PLAYER);
        this.nextPlayerPositionX = results[0].x;
        this.nextPlayerPositionY = results[0].y - LevelConstants.PLAYER_TILED_Y_OFFSET;
    },

    /**
     * Performs the one-pixel alignment phase.
     *
     * The original transition leaves this phase as soon as either the horizontal
     * axis or the vertical axis is aligned, not necessarily both. That odd rule
     * is part of the current game feel and is intentionally preserved.
     *
     * @returns {boolean} true when the sequence can continue to the next phase.
     */
    fineAlignOneAxis : function()
    {
        var horizontalDistance = Player.playerSprite.body.x - this.nextPlayerPositionX;
        var verticalDistance = Player.playerSprite.body.y - this.nextPlayerPositionY;

        if (verticalDistance == 0 || horizontalDistance == 0)
            return true;

        if (Math.abs(verticalDistance) < Math.abs(horizontalDistance))
            this.movePlayerVerticallyByOnePixel(verticalDistance);
        else
            this.movePlayerHorizontallyByOnePixel(horizontalDistance);

        return false;
    },

    movePlayerHorizontallyByOnePixel : function(horizontalDistance)
    {
        if (horizontalDistance > 0)
            Player.playerSprite.body.x -= 1;
        else
            Player.playerSprite.body.x += 1;
    },

    movePlayerVerticallyByOnePixel : function(verticalDistance)
    {
        if (verticalDistance > 0)
            Player.playerSprite.body.y -= 1;
        else
            Player.playerSprite.body.y += 1;
    },

    /**
     * Moves the player one tile-sized step toward the captured target.
     *
     * This method performs only one movement step. LevelTransition controls the
     * frame delay between steps, so the visible movement speed remains owned by
     * the sequence state machine.
     *
     * @returns {boolean} true when the player has reached the target position.
     */
    moveOneTileStepTowardTarget : function()
    {
        var horizontalDistance = Player.playerSprite.body.x - this.nextPlayerPositionX;
        var verticalDistance = Player.playerSprite.body.y - this.nextPlayerPositionY;

        if (verticalDistance == 0 && horizontalDistance == 0)
            return true;

        if (verticalDistance == 0)
            return this.moveHorizontallyByTileStep(horizontalDistance);

        return this.moveVerticallyByTileStep(verticalDistance);
    },

    moveHorizontallyByTileStep : function(horizontalDistance)
    {
        if (Math.abs(horizontalDistance) < LevelConstants.END_LEVEL_TRANSITION_TILE_STEP)
        {
            Player.playerSprite.body.x = this.nextPlayerPositionX;
            return true;
        }

        if (horizontalDistance > 0)
            Player.playerSprite.body.x -= LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;
        else
            Player.playerSprite.body.x += LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;

        return false;
    },

    moveVerticallyByTileStep : function(verticalDistance)
    {
        if (Math.abs(verticalDistance) < LevelConstants.END_LEVEL_TRANSITION_TILE_STEP)
        {
            Player.playerSprite.body.y = this.nextPlayerPositionY;
            return true;
        }

        if (verticalDistance > 0)
            Player.playerSprite.body.y -= LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;
        else
            Player.playerSprite.body.y += LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;

        return false;
    }
};
