import { LevelConstants } from "./levelConstants.ts";
import { Level } from "./level.js";

interface TileWithProperties {
	properties: Record<string, any>;
	alpha: number;
	worldY: number;
}

/**
 * Centralizes gameplay collision checks.
 *
 * The game still uses many manual pixel probes against the Tiled map and
 * Phaser rectangles. These checks are gameplay-sensitive, so this object keeps
 * the existing algorithms and offsets untouched while giving collision logic a
 * clearer home than the generic Util object.
 *
 * CollisionDetector is now exported as an ES module so movement and interaction
 * modules can depend on it explicitly.
 */
export const CollisionDetector =
{
    // Store the last tile hit by a tile-based collision check.
    // Key collection uses this reference to hide the collected key tile.
    lastTileHit : null as TileWithProperties | null,

    // Check if there are some tiles with a given property on a horizontal line.
    horizontalCollisionLine : function(xStart: number, xEnd: number, yPosition: number, propertyName: string, propertyValue: any, onTop: boolean): boolean
    {
        var collision = false;

        // Check every horizontal position.
        for(var xPosition = xStart; xPosition <= xEnd; xPosition++)
        {
            var tile = map.getTileWorldXY(xPosition, yPosition) as TileWithProperties | null;

            if (tile == null) continue;

            if (tile.properties[propertyName] == propertyValue && tile.alpha == 1)
            {
                if (onTop && yPosition != tile.worldY) continue;

                this.lastTileHit = tile;
                collision = true;
                break;
            }
        }

        return collision;
    },

    // Check if there are some tiles with a given property on a vertical line.
    verticalCollisionLine : function(yStart: number, yEnd: number, xPosition: number, propertyName: string, propertyValue: any, onTop: boolean): boolean
    {
        var collision = false;

        // Check every vertical position.
        for(var yPosition = yStart; yPosition <= yEnd; yPosition++)
        {
            var tile = map.getTileWorldXY(xPosition, yPosition) as TileWithProperties | null;

            if (tile != null && tile.properties[propertyName] == propertyValue && tile.alpha == 1)
            {
                this.lastTileHit = tile;
                collision = true;
                break;
            }
        }

        return collision;
    },

    // Check if there are some tiles with a given property on the bounds of a rectangle.
    collisionRectangle : function(xStart: number, yStart: number, xEnd: number, yEnd: number, propertyName: string, propertyValue: any): boolean
    {
        // Check the upper bound.
        if (this.horizontalCollisionLine(xStart, xEnd, yStart, propertyName, propertyValue, false))
            return true;

        // Check the bottom bound.
        if (this.horizontalCollisionLine(xStart, xEnd, yEnd, propertyName, propertyValue, false))
            return true;

        // Check the left bound.
        if (this.verticalCollisionLine(yStart, yEnd, xStart, propertyName, propertyValue, false))
            return true;

        // Check the right bound.
        if (this.verticalCollisionLine(yStart, yEnd, xEnd, propertyName, propertyValue, false))
            return true;

        return false;
    },

    // Check if there is a collision between the player and the end-level object.
    collisionRectangleWithEndLevel : function(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean
    {
        var playerRectangle = new Phaser.Rectangle(xStart, yStart, xEnd - xStart, yEnd - yStart);
        var endLevelRectangle = new Phaser.Rectangle(Level.endLevel.x, Level.endLevel.y, Level.endLevel.width, Level.endLevel.height);

        return Phaser.Rectangle.intersects(playerRectangle, endLevelRectangle);
    },

    // Check if there is a collision with a monster for a given region.
    collisionRectangleWithMonsters : function(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean
    {
        // Set the collision area for the player.
        var playerRectangle = new Phaser.Rectangle(xStart, yStart, xEnd - xStart, yEnd - yStart);

        // For each monster.
        for (var i = 0; i < Level.monsters.length; i++)
        {
            var monster = Level.monsters[i];

            // Set the collision area for the monster.
            var monsterRectangle = new Phaser.Rectangle(
                monster.sprite.x + monster.collisionOffsetX,
                monster.sprite.y + monster.collisionOffsetY,
                monster.realWidth,
                monster.realHeight);

            if (Phaser.Rectangle.intersects(playerRectangle, monsterRectangle))
                return true;
        }

        return false;
    },

    // Check if there are some vanishing platforms on a horizontal line.
    collisionLineWithVanishingPlatform : function(xStart: number, xEnd: number, yPosition: number): boolean
    {
        var collision = false;

        // Check every horizontal position.
        for(var xPosition = xStart; xPosition <= xEnd; xPosition++)
        {
            var tile = map.getTileWorldXY(xPosition, yPosition) as TileWithProperties | null;

            if (tile != null && tile.properties[LevelConstants.TILED_PROPERTY_NAME] == LevelConstants.TILE_NAME_VANISHING_PLATFORM)
            {
                // If the platform has not disappeared and the player is above.
                if (vanishingPlatformGroup.getAt(0).animations.currentAnim.currentFrame.index != 4 &&
                    yPosition == tile.worldY)
                {
                    collision = true;
                    break;
                }
            }
        }

        return collision;
    }
};
