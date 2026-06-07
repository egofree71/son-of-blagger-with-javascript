import type { Tilemaps } from "phaser";
import type { PlayerProbeRectangle } from "./Player";

/**
 * Detects deadly background tiles touched by the player.
 *
 * The map marks traps with the Tiled property `type = deadly`. Collision is a
 * manual rectangle-edge probe so traps are triggered by the same narrow player
 * area as keys, exits and monsters.
 */
export class DeadlyTileDetector
{
    private static readonly TILED_PROPERTY_TYPE = "type";
    private static readonly TILE_TYPE_DEADLY = "deadly";

    /**
     * @param layer Background tile layer that contains trap metadata.
     */
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
        // Only scan the rectangle edges. A filled-area scan would make traps
        // trigger earlier when the probe overlaps a tile corner.
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

        // Scan each pixel along the edge because trap timing depends on exact
        // contact with narrow decorative tiles.
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
