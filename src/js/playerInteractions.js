/**
 * Handles gameplay interactions that are triggered by the player's position.
 *
 * Player.update() still owns movement, jumping, falling, and animation. Once the
 * movement intent has been applied, it delegates key collection, deadly
 * collisions, and exit detection to this object.
 *
 * The x/y values passed by Player.update() are intentionally the coordinates
 * captured at the beginning of the frame. This preserves the timing of the old
 * implementation, which performed the interaction checks with those same values
 * after applying the one-pixel movement.
 */
window.PlayerInteractions =
{
    // Collision rectangle offsets used when collecting keys.
    KEY_LEFT_OFFSET : 7,
    KEY_RIGHT_OFFSET : 23,
    KEY_TOP_OFFSET : 0,
    KEY_BOTTOM_OFFSET : 0,

    // Collision rectangle offsets used for deadly tile checks.
    DEADLY_LEFT_OFFSET : 5,
    DEADLY_RIGHT_OFFSET : 27,
    DEADLY_TOP_OFFSET : 0,
    DEADLY_BOTTOM_OFFSET : -1,

    // Collision rectangle offsets used for monster and exit checks.
    BODY_LEFT_OFFSET : 4,
    BODY_RIGHT_OFFSET : 28,
    BODY_TOP_OFFSET : 0,
    BODY_BOTTOM_OFFSET : 0,

    /**
     * Runs all non-movement interactions for the player.
     */
    update : function(player, x, y)
    {
        this.collectKeyIfNeeded(player, x, y);
        this.killPlayerIfNeeded(player, x, y);
        this.exitLevelIfNeeded(player, x, y);
    },

    /**
     * Collects a key tile if the player's key collision box touches one.
     */
    collectKeyIfNeeded : function(player, x, y)
    {
        var playerHeight = player.playerSprite.body.height;

        if (CollisionDetector.collisionRectangle(
            x + this.KEY_LEFT_OFFSET,
            y + this.KEY_TOP_OFFSET,
            x + this.KEY_RIGHT_OFFSET,
            y + playerHeight + this.KEY_BOTTOM_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_KEY,
            false))
        {
            Level.keysTaken++;

            // Increase the score.
            GameController.score += LevelConstants.KEY_SCORE_INCREMENT;
            HUD.displayScore();

            // Hide the key tile and force the tilemap layer to redraw.
            CollisionDetector.lastTileHit.alpha = 0;
            layer.dirty = true;
        }
    },

    /**
     * Kills the player if the current collision box touches a deadly tile or a monster.
     */
    killPlayerIfNeeded : function(player, x, y)
    {
        var playerHeight = player.playerSprite.body.height;

        if (CollisionDetector.collisionRectangle(
                x + this.DEADLY_LEFT_OFFSET,
                y + this.DEADLY_TOP_OFFSET,
                x + this.DEADLY_RIGHT_OFFSET,
                y + playerHeight + this.DEADLY_BOTTOM_OFFSET,
                LevelConstants.TILED_PROPERTY_TYPE,
                LevelConstants.TILE_TYPE_DEADLY,
                false) ||
            CollisionDetector.collisionRectangleWithMonsters(
                x + this.BODY_LEFT_OFFSET,
                y + this.BODY_TOP_OFFSET,
                x + this.BODY_RIGHT_OFFSET,
                y + playerHeight + this.BODY_BOTTOM_OFFSET))
        {
            player.kill();
        }
    },

    /**
     * Starts the end-level or end-game sequence when all keys have been collected
     * and the player touches the level exit.
     */
    exitLevelIfNeeded : function(player, x, y)
    {
        var playerHeight = player.playerSprite.body.height;

        if (Level.keysTaken == Data.levels[Level.level - 1][0] &&
            CollisionDetector.collisionRectangleWithEndLevel(
                x + this.BODY_LEFT_OFFSET,
                y + this.BODY_TOP_OFFSET,
                x + this.BODY_RIGHT_OFFSET,
                y + playerHeight + this.BODY_BOTTOM_OFFSET))
        {
            if (Level.level == Data.levels.length)
                GameController.gameState = GameStates.END_GAME;
            else
                GameController.gameState = GameStates.END_LEVEL;
        }
    }
};
