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
    private static readonly TILE_TYPE_SOLID = "solid";

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
        propertyValue: unknown
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

            if (this.tileHasProperty(tile, propertyName, propertyValue)) {
                return true;
            }
        }

        return false;
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
