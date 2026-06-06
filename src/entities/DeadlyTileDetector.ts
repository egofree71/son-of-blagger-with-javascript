import type { Tilemaps } from "phaser";
import type { PlayerProbeRectangle } from "./Player";

/**
 * Detects deadly background tiles touched by the player in the Phaser 4 prototype.
 *
 * The original Phaser 2 interaction code checks a narrow player rectangle against
 * Tiled tiles whose `type` property is `deadly`. This helper ports that rule for
 * the modernization prototype without adding Arcade Physics or the final death
 * sequence yet.
 */
export class DeadlyTileDetector
{
    private static readonly TILED_PROPERTY_TYPE = "type";
    private static readonly TILE_TYPE_DEADLY = "deadly";

    constructor(private readonly layer: Tilemaps.TilemapLayerBase)
    {
    }

    /**
     * Returns true when the supplied player probe touches any visible deadly tile.
     */
    touchesDeadlyTile(bounds: PlayerProbeRectangle): boolean
    {
        return this.rectangleHasDeadlyTile(bounds);
    }

    private rectangleHasDeadlyTile(bounds: PlayerProbeRectangle): boolean
    {
        // Match the Phaser 2 collisionRectangle helper: only the four edges of
        // the probe rectangle are scanned, not the filled interior.
        return this.lineHasDeadlyTile(bounds.xStart, bounds.xEnd, bounds.yStart, "horizontal") ||
            this.lineHasDeadlyTile(bounds.xStart, bounds.xEnd, bounds.yEnd, "horizontal") ||
            this.lineHasDeadlyTile(bounds.yStart, bounds.yEnd, bounds.xStart, "vertical") ||
            this.lineHasDeadlyTile(bounds.yStart, bounds.yEnd, bounds.xEnd, "vertical");
    }

    private lineHasDeadlyTile(startPosition: number, endPosition: number, fixedPosition: number, orientation: "horizontal" | "vertical"): boolean
    {
        const start = Math.floor(Math.min(startPosition, endPosition));
        const end = Math.floor(Math.max(startPosition, endPosition));
        const fixed = Math.floor(fixedPosition);

        // Keep the pixel-by-pixel scan used by PlayerInteractions.ts so trap
        // timing can be compared before optimizing the Phaser 4 version.
        for (let position = start; position <= end; position += 1) {
            const tile = orientation === "horizontal"
                ? this.layer.getTileAtWorldXY(position, fixed)
                : this.layer.getTileAtWorldXY(fixed, position);

            if (this.isVisibleDeadlyTile(tile as Tilemaps.Tile | null)) {
                return true;
            }
        }

        return false;
    }

    private isVisibleDeadlyTile(tile: Tilemaps.Tile | null): boolean
    {
        if (!tile) {
            return false;
        }

        if (tile.visible === false || tile.alpha !== 1) {
            return false;
        }

        return tile.properties?.[DeadlyTileDetector.TILED_PROPERTY_TYPE] === DeadlyTileDetector.TILE_TYPE_DEADLY;
    }
}
