import type { Tilemaps } from "phaser";

/**
 * Small Phaser 4 collision helper for manual tile probes.
 *
 * The original Phaser 2 game does not rely on Arcade Physics for most player
 * movement. It scans short horizontal and vertical pixel lines against tile
 * properties stored in the Tiled map. This prototype helper ports only the tiny
 * slice needed for horizontal wall blocking, while keeping the same style of
 * explicit pixel probes for later movement work.
 */
export class TileCollisionProbe
{
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly TILE_NAME_WALL = "wall";

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
     * Generic vertical line scan used by the first collision prototype.
     *
     * The loop intentionally checks every pixel, not just every tile boundary,
     * because the old CollisionDetector did the same. That makes the port easier
     * to compare before any performance cleanup is considered.
     */
    private verticalLineHasProperty(
        yStart: number,
        yEnd: number,
        x: number,
        propertyName: string,
        propertyValue: unknown
    ): boolean
    {
        const start = Math.floor(Math.min(yStart, yEnd));
        const end = Math.floor(Math.max(yStart, yEnd));
        const worldX = Math.floor(x);

        for (let y = start; y <= end; y += 1) {
            const tile = this.layer.getTileAtWorldXY(worldX, y) as Tilemaps.Tile | null;

            if (tile?.properties?.[propertyName] === propertyValue) {
                return true;
            }
        }

        return false;
    }
}
