import type { Tilemaps } from "phaser";

/**
 * Small Phaser 4 collision helper for manual tile probes.
 *
 * The original Phaser 2 game does not rely on Arcade Physics for most player
 * movement. It scans short horizontal and vertical pixel lines against tile
 * properties stored in the Tiled map. This prototype helper now ports the first
 * wall and floor checks while keeping that explicit pixel-probe style intact.
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

    constructor(private readonly layer: Tilemaps.TilemapLayerBase)
    {
    }

    /**
     * Checks whether a vertical pixel line touches a Tiled tile named "wall".
     *
     * Player movement uses this for side blocking: the probe line is deliberately
     * narrower than the full 48px sprite, matching the tolerant wall checks in
     * the Phaser 2 reference implementation.
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
     * Checks whether a horizontal pixel line touches a Tiled tile named "wall".
     *
     * The first jump prototype uses this for ceiling blocking. It mirrors the
     * Phaser 2 movement rule that tests a narrow line slightly above the sprite
     * instead of treating the full visual rectangle as collidable.
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
        // Match the Phaser 2 collisionRectangle helper: only the four edges of
        // the probe rectangle are tested, not the whole filled area.
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
        // Convert probe coordinates to integer pixels before scanning. The old
        // CollisionDetector tested pixel positions, not fractional world values.
        const start = Math.floor(Math.min(yStart, yEnd));
        const end = Math.floor(Math.max(yStart, yEnd));
        const worldX = Math.floor(x);

        // Check every pixel along the line, like the Phaser 2 reference. This is
        // intentionally faithful first; any optimization can wait until parity.
        for (let y = start; y <= end; y += 1) {
            const tile = this.layer.getTileAtWorldXY(worldX, y) as Tilemaps.Tile | null;

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

        // The first prototype keeps the original pixel-by-pixel style even
        // though tile-step scans would be faster.
        for (let x = start; x <= end; x += 1) {
            const tile = this.layer.getTileAtWorldXY(x, worldY) as Tilemaps.Tile | null;

            if (!this.tileHasProperty(tile, propertyName, propertyValue)) {
                continue;
            }

            // Jump landings use the Phaser 2 "onTop" rule: touching a tile is
            // not enough; Sid must have reached the tile's upper edge. This
            // prevents catching the side or underside of thin metal platforms.
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

        // Phaser 2 ignored invisible tiles during collision checks. Phaser 4 map
        // tiles normally have alpha 1, but this keeps the old rule explicit.
        const tileAlpha = (tile as Tilemaps.Tile & { alpha?: number }).alpha;

        if (tileAlpha !== undefined && tileAlpha !== 1) {
            return false;
        }

        return tile.properties?.[propertyName] === propertyValue;
    }
}
