import type { Tilemaps } from "phaser";
import type { PlayerProbeRectangle } from "./Player";

/**
 * Collects key tiles touched by the player.
 *
 * Keys are regular Tiled tiles with `name = key`. This class owns the tile
 * visibility changes and the collected count; score, HUD refresh and level
 * completion stay in the game/session state.
 */
export class KeyCollector
{
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly TILE_NAME_KEY = "key";

    private collectedCount = 0;

    /**
     * @param layer Background tile layer that contains key tiles.
     */
    constructor(private readonly layer: Tilemaps.TilemapLayerBase)
    {
        this.showAllKeyTiles();
    }

    /**
     * Returns the number of keys collected since this collector was created.
     */
    get collectedKeys(): number
    {
        return this.collectedCount;
    }

    /**
     * Restores all key tiles and resets the collected-key counter.
     */
    reset(): void
    {
        this.collectedCount = 0;
        this.showAllKeyTiles();
    }

    /**
     * Collects the first visible key touched by the supplied player probe.
     */
    collectFromPlayerProbe(bounds: PlayerProbeRectangle): boolean
    {
        const tile = this.findFirstKeyTileOnRectangle(bounds);

        if (!tile) {
            return false;
        }

        this.hideCollectedKey(tile);
        this.collectedCount += 1;
        return true;
    }

    /**
     * Collects every key tile for debug-only fast testing.
     */
    collectAllForDebug(keysNeeded: number): void
    {
        this.layer.forEachTile((tile) => {
            if (!this.isKeyTile(tile)) {
                return;
            }

            this.hideCollectedKey(tile);
        });

        // The level state owns the expected key count. Use it here so the exit
        // opens even if one or more key tiles were already hidden during testing.
        this.collectedCount = keysNeeded;
    }

    private showAllKeyTiles(): void
    {
        this.layer.forEachTile((tile) => {
            if (!this.isKeyTile(tile, false)) {
                return;
            }

            // A reset must restore both rendering flags because collected keys
            // are hidden with `visible = false` and `alpha = 0`.
            tile.visible = true;
            tile.alpha = 1;
        });
    }

    private findFirstKeyTileOnRectangle(bounds: PlayerProbeRectangle): Tilemaps.Tile | null
    {
        // Only scan the rectangle edges. This gives a precise pickup moment while
        // avoiding a broad filled-area overlap.
        return this.findFirstKeyTileOnHorizontalLine(bounds.xStart, bounds.xEnd, bounds.yStart) ??
            this.findFirstKeyTileOnHorizontalLine(bounds.xStart, bounds.xEnd, bounds.yEnd) ??
            this.findFirstKeyTileOnVerticalLine(bounds.yStart, bounds.yEnd, bounds.xStart) ??
            this.findFirstKeyTileOnVerticalLine(bounds.yStart, bounds.yEnd, bounds.xEnd);
    }

    private findFirstKeyTileOnHorizontalLine(xStart: number, xEnd: number, y: number): Tilemaps.Tile | null
    {
        const start = Math.floor(Math.min(xStart, xEnd));
        const end = Math.floor(Math.max(xStart, xEnd));
        const worldY = Math.floor(y);
        const tileWidth = this.layer.tilemap.tileWidth;
        const startTileX = Math.floor(start / tileWidth);
        const endTileX = Math.floor(end / tileWidth);

        // Keys are whole tiles. Scanning the touched tile columns preserves
        // boundary pickups while avoiding a getTileAtWorldXY call for every pixel.
        for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
            const tile = this.layer.getTileAtWorldXY(tileX * tileWidth, worldY) as Tilemaps.Tile | null;

            if (this.isKeyTile(tile)) {
                return tile;
            }
        }

        return null;
    }

    private findFirstKeyTileOnVerticalLine(yStart: number, yEnd: number, x: number): Tilemaps.Tile | null
    {
        const start = Math.floor(Math.min(yStart, yEnd));
        const end = Math.floor(Math.max(yStart, yEnd));
        const worldX = Math.floor(x);
        const tileHeight = this.layer.tilemap.tileHeight;
        const startTileY = Math.floor(start / tileHeight);
        const endTileY = Math.floor(end / tileHeight);

        // Vertical edges are needed because keys can be touched from the side.
        // Iterate by tile row instead of by pixel for the same contact result.
        for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
            const tile = this.layer.getTileAtWorldXY(worldX, tileY * tileHeight) as Tilemaps.Tile | null;

            if (this.isKeyTile(tile)) {
                return tile;
            }
        }

        return null;
    }

    private hideCollectedKey(tile: Tilemaps.Tile): void
    {
        // Hide the tile for rendering and for future probe checks. Both flags are
        // restored by showAllKeyTiles() during a reset.
        tile.alpha = 0;
        tile.visible = false;
    }

    private isKeyTile(tile: Tilemaps.Tile | null, requireVisible = true): tile is Tilemaps.Tile
    {
        if (!tile) {
            return false;
        }

        if (requireVisible && (tile.visible === false || tile.alpha !== 1)) {
            return false;
        }

        return tile.properties?.[KeyCollector.TILED_PROPERTY_NAME] === KeyCollector.TILE_NAME_KEY;
    }
}
