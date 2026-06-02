/**
 * PlayerMovementProbes centralizes the pixel probes used by player movement.
 *
 * The values below are gameplay-sensitive. They define where the code samples
 * the map around the player to decide whether there is ground, a wall, a slide,
 * a ladder, or a vanishing platform. Small changes can noticeably affect the
 * platforming feel, so this object keeps those offsets named and isolated.
 */
var PlayerMovementProbes =
{
    // Horizontal foot probes. These are used to test the tiles below the player.
    // They intentionally do not span the full sprite width, so the player can
    // stand near edges without instantly falling.
    FOOT_LEFT_OFFSET : 7,
    FOOT_RIGHT_OFFSET : 23,

    // Slides are detected slightly below the feet so the player starts following
    // the slope only when already standing on it.
    SLIDE_PROBE_Y_OFFSET : 14,

    // Ladder detection uses a small rectangle around the lower part of the
    // player. This makes ladders feel forgiving without allowing climbing from
    // too far away.
    LADDER_LEFT_OFFSET : 7,
    LADDER_RIGHT_OFFSET : 23,
    LADDER_TOP_FROM_BOTTOM_OFFSET : 18,
    LADDER_BOTTOM_FROM_BOTTOM_OFFSET : 1,

    // Wall probes. The side probes are narrower than the sprite to preserve the
    // original movement tolerance around corners.
    WALL_ABOVE_Y_OFFSET : -2,
    RIGHT_WALL_X_OFFSET : 24,
    LEFT_WALL_X_OFFSET : 5,
    SIDE_WALL_TOP_OFFSET : 6,
    SIDE_WALL_BOTTOM_OFFSET : 1,

    /**
     * Checks whether the player has landed during the falling part of a jump.
     *
     * Landing can happen on a solid tile, a slide tile, or a vanishing platform.
     */
    isLandingAfterJump : function(player, x, y)
    {
        return this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, true) ||
            this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SLIDE, true) ||
            this.hasVanishingPlatformBelow(player, x, y);
    },

    /**
     * Tests the short horizontal foot line against tiles of a given type.
     */
    hasGroundBelow : function(player, x, y, tileType, onTop)
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.playerSprite.body.height,
            LevelConstants.TILED_PROPERTY_TYPE,
            tileType,
            onTop);
    },

    /**
     * Tests whether a non-vanished vanishing platform is directly below the feet.
     */
    hasVanishingPlatformBelow : function(player, x, y)
    {
        return CollisionDetector.collisionLineWithVanishingPlatform(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.playerSprite.body.height);
    },

    /**
     * Tests whether the player is standing on a tile with a specific Tiled name.
     */
    isOnTileByName : function(player, x, y, tileName, yOffset)
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.playerSprite.body.height + yOffset,
            LevelConstants.TILED_PROPERTY_NAME,
            tileName,
            false);
    },

    /**
     * Checks the small rectangle used for ladder climbing.
     *
     * The rectangle is intentionally located near the player's feet/body rather
     * than covering the full sprite. This reproduces the existing ladder behavior.
     */
    isOnLadder : function(player, x, y)
    {
        return CollisionDetector.collisionRectangle(
            x + this.LADDER_LEFT_OFFSET,
            y + player.playerSprite.body.height - this.LADDER_TOP_FROM_BOTTOM_OFFSET,
            x + this.LADDER_RIGHT_OFFSET,
            y + player.playerSprite.body.height - this.LADDER_BOTTOM_FROM_BOTTOM_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_LADDER);
    },

    /**
     * Checks whether moving up would hit a wall tile above the player.
     */
    isBlockedAbove : function(player, x, y)
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + this.WALL_ABOVE_Y_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_WALL);
    },

    /**
     * Checks whether moving right would hit a wall tile.
     */
    isBlockedRight : function(player, x, y)
    {
        return CollisionDetector.verticalCollisionLine(
            y + this.SIDE_WALL_TOP_OFFSET,
            y + player.playerSprite.body.height - this.SIDE_WALL_BOTTOM_OFFSET,
            x + this.RIGHT_WALL_X_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_WALL,
            false);
    },

    /**
     * Checks whether moving left would hit a wall tile.
     */
    isBlockedLeft : function(player, x, y)
    {
        return CollisionDetector.verticalCollisionLine(
            y + this.SIDE_WALL_TOP_OFFSET,
            y + player.playerSprite.body.height - this.SIDE_WALL_BOTTOM_OFFSET,
            x + this.LEFT_WALL_X_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_WALL,
            false);
    }
};
