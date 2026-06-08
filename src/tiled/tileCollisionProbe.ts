import type { Tilemaps } from "phaser";

/**
 * Collision helper for manual tile probes.
 *
 * Player movement does not use Arcade Physics for tile contacts. Instead it
 * scans short horizontal and vertical lines against properties stored in the
 * Tiled map, which gives precise control over walls, floors, slides, ladders
 * and conveyors.
 */
export class TileCollisionProbe
{
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly TILED_PROPERTY_TYPE = "type";
    private static readonly TILE_NAME_WALL = "wall";
    private static readonly TILE_NAME_LEFT_SLIDE = "left slide";
    private static readonly TILE_NAME_RIGHT_SLIDE = "right slide";
    private static readonly TILE_NAME_LADDER = "ladder";
    private static readonly TILE_NAME_CONVEYOR_RIGHT = "conveyor right";
    private static readonly TILE_NAME_CONVEYOR_LEFT = "conveyor left";
    private static readonly TILE_TYPE_SOLID = "solid";
    private static readonly TILE_TYPE_SLIDE = "slide";

    /**
     * @param layer Background tile layer queried by all probes.
     */
    constructor(private readonly layer: Tilemaps.TilemapLayerBase)
    {
    }

    /**
     * Checks whether a vertical probe line touches a Tiled tile named "wall".
     *
     * Player movement uses this for side blocking. The probe line is deliberately
     * narrower than the full 48px sprite, so visual padding does not collide.
     */
    hasWallOnVerticalLine(yStart: number, yEnd: number, x: number): boolean
    {
        return this.verticalLineHasProperty(
            yStart,
            yEnd,
            x,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_WALL
        );
    }

    /**
     * Checks whether a horizontal probe line touches a Tiled tile named "wall".
     *
     * Jumping uses this for ceiling blocking. The probe tests a narrow line
     * slightly above the sprite instead of treating the full visual rectangle as
     * collidable.
     */
    hasWallOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_WALL
        );
    }

    /**
     * Checks whether a horizontal foot probe touches a solid tile.
     */
    hasSolidOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_TYPE,
            TileCollisionProbe.TILE_TYPE_SOLID
        );
    }

    /**
     * Checks whether the foot probe is exactly on top of a solid tile.
     */
    hasSolidTopOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_TYPE,
            TileCollisionProbe.TILE_TYPE_SOLID,
            true
        );
    }

    /**
     * Checks whether a horizontal foot probe touches any slide tile.
     */
    hasSlideOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_TYPE,
            TileCollisionProbe.TILE_TYPE_SLIDE
        );
    }

    /**
     * Checks whether the foot probe is exactly on top of a slide tile.
     */
    hasSlideTopOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_TYPE,
            TileCollisionProbe.TILE_TYPE_SLIDE,
            true
        );
    }

    /**
     * Checks whether the probe touches a left-moving slide tile.
     */
    hasLeftSlideOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_LEFT_SLIDE
        );
    }

    /**
     * Checks whether the probe touches a right-moving slide tile.
     */
    hasRightSlideOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_RIGHT_SLIDE
        );
    }

    /**
     * Checks whether the small player probe rectangle touches a ladder tile.
     */
    hasLadderInRectangle(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean
    {
        return this.rectangleHasProperty(
            xStart,
            yStart,
            xEnd,
            yEnd,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_LADDER
        );
    }

    /**
     * Checks whether the foot probe touches a right-moving conveyor tile.
     */
    hasRightConveyorOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_CONVEYOR_RIGHT
        );
    }

    /**
     * Checks whether the foot probe touches a left-moving conveyor tile.
     */
    hasLeftConveyorOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        return this.horizontalLineHasProperty(
            xStart,
            xEnd,
            y,
            TileCollisionProbe.TILED_PROPERTY_NAME,
            TileCollisionProbe.TILE_NAME_CONVEYOR_LEFT
        );
    }

    private rectangleHasProperty(
        xStart: number,
        yStart: number,
        xEnd: number,
        yEnd: number,
        propertyName: string,
        propertyValue: unknown
    ): boolean
    {
        // Only test the four edges, not the whole filled rectangle. This avoids
        // triggering contacts too early when a probe overlaps a tile corner.
        return this.horizontalLineHasProperty(xStart, xEnd, yStart, propertyName, propertyValue) ||
            this.horizontalLineHasProperty(xStart, xEnd, yEnd, propertyName, propertyValue) ||
            this.verticalLineHasProperty(yStart, yEnd, xStart, propertyName, propertyValue) ||
            this.verticalLineHasProperty(yStart, yEnd, xEnd, propertyName, propertyValue);
    }

    private verticalLineHasProperty(
        yStart: number,
        yEnd: number,
        x: number,
        propertyName: string,
        propertyValue: unknown
    ): boolean
    {
        // Convert probe coordinates to integer pixels before scanning so tiny
        // fractional camera or sprite values cannot change collision results.
        const start = Math.floor(Math.min(yStart, yEnd));
        const end = Math.floor(Math.max(yStart, yEnd));
        const worldX = Math.floor(x);
        const tileHeight = this.layer.tilemap.tileHeight;
        const startTileY = Math.floor(start / tileHeight);
        const endTileY = Math.floor(end / tileHeight);

        // Tiles have uniform metadata across their 16x16 area. Scanning each tile
        // crossed by the line is equivalent to the old pixel-by-pixel scan, but
        // it avoids dozens of getTileAtWorldXY calls per gameplay frame.
        for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
            const tile = this.layer.getTileAtWorldXY(worldX, tileY * tileHeight) as Tilemaps.Tile | null;

            if (this.tileHasProperty(tile, propertyName, propertyValue)) {
                return true;
            }
        }

        return false;
    }

    private horizontalLineHasProperty(
        xStart: number,
        xEnd: number,
        y: number,
        propertyName: string,
        propertyValue: unknown,
        requireTileTop = false
    ): boolean
    {
        // Use integer pixel positions for the foot probe so edge comparisons stay
        // stable when sprites or cameras contain fractional coordinates.
        const start = Math.floor(Math.min(xStart, xEnd));
        const end = Math.floor(Math.max(xStart, xEnd));
        const worldY = Math.floor(y);
        const tileWidth = this.layer.tilemap.tileWidth;
        const startTileX = Math.floor(start / tileWidth);
        const endTileX = Math.floor(end / tileWidth);

        // For top-only checks, touching a tile is not enough: Sid must have
        // reached the tile's upper edge. This keeps the old side/underside rule
        // while avoiding one test per pixel.
        if (requireTileTop && worldY % this.layer.tilemap.tileHeight !== 0) {
            return false;
        }

        // Tiles have uniform metadata across their 16x16 area. Scanning each tile
        // crossed by the line keeps one-pixel boundary contacts because both tile
        // columns are included when the probe spans a tile edge.
        for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
            const tile = this.layer.getTileAtWorldXY(tileX * tileWidth, worldY) as Tilemaps.Tile | null;

            if (!this.tileHasProperty(tile, propertyName, propertyValue)) {
                continue;
            }

            if (requireTileTop && !this.isProbeOnTileTop(tile, worldY)) {
                continue;
            }

            return true;
        }

        return false;
    }

    private isProbeOnTileTop(tile: Tilemaps.Tile | null, worldY: number): boolean
    {
        if (!tile) {
            return false;
        }

        return worldY === tile.y * this.layer.tilemap.tileHeight;
    }

    private tileHasProperty(tile: Tilemaps.Tile | null, propertyName: string, propertyValue: unknown): boolean
    {
        if (!tile) {
            return false;
        }

        // Hidden tiles should not collide; collected keys and replaced animated
        // tiles rely on this rule.
        const tileAlpha = (tile as Tilemaps.Tile & { alpha?: number }).alpha;

        if (tileAlpha !== undefined && tileAlpha !== 1) {
            return false;
        }

        return tile.properties?.[propertyName] === propertyValue;
    }
}
