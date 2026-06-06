import type { Tilemaps } from "phaser";
import type { PlayerProbeRectangle } from "./Player";

/**
 * Collects key tiles touched by the player in the Phaser 4 prototype.
 *
 * The current port keeps the original Phaser 2 idea: key collection is a manual
 * rectangle probe against Tiled tile properties, not an Arcade Physics overlap.
 * Only the local tile mutation and collected-key count live here; score, level
 * transitions and the real HUD can be added later once the full game flow moves
 * into the modern version.
 */
export class KeyCollector
{
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly TILE_NAME_KEY = "key";

    private collectedCount = 0;

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
     * Restores all key tiles and resets the temporary collected-key counter.
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

    private showAllKeyTiles(): void
    {
        this.layer.forEachTile((tile) => {
            if (!this.isKeyTile(tile, false)) {
                return;
            }

            // Phaser 2 restores key alpha during the level reveal. The Phaser 4
            // prototype has no level reload yet, but restoring here keeps the
            // collector safe if GameScene is restarted while testing.
            tile.visible = true;
            tile.alpha = 1;
        });
    }

    private findFirstKeyTileOnRectangle(bounds: PlayerProbeRectangle): Tilemaps.Tile | null
    {
        // Match the old collisionRectangle helper: only the rectangle edges are
        // scanned. This keeps key pickup timing close to PlayerInteractions.ts.
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

        // Keep the pixel-by-pixel probe for parity with the old key collision.
        for (let x = start; x <= end; x += 1) {
            const tile = this.layer.getTileAtWorldXY(x, worldY) as Tilemaps.Tile | null;

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

        // Vertical edges are needed because keys can be touched from the side.
        for (let y = start; y <= end; y += 1) {
            const tile = this.layer.getTileAtWorldXY(worldX, y) as Tilemaps.Tile | null;

            if (this.isKeyTile(tile)) {
                return tile;
            }
        }

        return null;
    }

    private hideCollectedKey(tile: Tilemaps.Tile): void
    {
        // Phaser 2 hid collected keys by setting alpha to 0. Do the same and
        // also mark the tile invisible so Phaser 4 rendering and probes agree.
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
