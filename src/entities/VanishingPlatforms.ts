import type { GameObjects, Scene, Tilemaps } from "phaser";

/**
 * Manages the animated vanishing platforms used by the Phaser 4 prototype.
 *
 * The original Phaser 2 implementation generated animated sprites from special
 * Tiled tiles and kept collision tied to the platform animation frame. This
 * class keeps that behavior local to the modern prototype instead of pushing
 * more special cases into the generic tile-probe helper.
 */
export class VanishingPlatforms
{
    private static readonly TILE_NAME_VANISHING_PLATFORM = "vanishing platform";
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly BLANK_TILE_INDEX = 30;
    private static readonly FRAME_COUNT = 8;
    private static readonly NON_COLLIDING_FRAME = 4;
    // Phaser 2 played this group at two animation frames per second. Using
    // elapsed milliseconds keeps that speed stable on 60 Hz, 120 Hz or 144 Hz screens.
    private static readonly FRAME_DURATION_MS = 500;

    private readonly tileCoordinates = new Set<string>();
    private readonly sprites: GameObjects.Sprite[] = [];
    private frameIndex = 0;
    private elapsedFrameTimeMs = 0;

    constructor(
        private readonly scene: Scene,
        private readonly layer: Tilemaps.TilemapLayerBase,
        private readonly textureKey: string
    )
    {
        this.createSpritesFromLayer();
    }

    /**
     * Advances the shared vanishing-platform animation by elapsed time.
     */
    update(deltaMs: number): void
    {
        if (this.sprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < VanishingPlatforms.FRAME_DURATION_MS) {
            return;
        }

        // Preserve any extra elapsed time so the animation does not drift when
        // the browser delivers an occasional long frame.
        this.elapsedFrameTimeMs %= VanishingPlatforms.FRAME_DURATION_MS;
        this.frameIndex = (this.frameIndex + 1) % VanishingPlatforms.FRAME_COUNT;

        for (const sprite of this.sprites) {
            sprite.setFrame(this.frameIndex);
        }
    }

    /**
     * Checks whether the player's foot line is supported by a visible platform.
     */
    hasCollisionOnHorizontalLine(xStart: number, xEnd: number, y: number): boolean
    {
        if (this.frameIndex === VanishingPlatforms.NON_COLLIDING_FRAME) {
            return false;
        }

        const tileY = Math.floor(y / this.layer.tilemap.tileHeight);
        const tileTopY = tileY * this.layer.tilemap.tileHeight;

        // Phaser 2 only collides when the foot probe is exactly on the top edge
        // of the vanishing-platform tile, not when the probe passes through it.
        if (Math.floor(y) !== tileTopY) {
            return false;
        }

        const start = Math.floor(Math.min(xStart, xEnd));
        const end = Math.floor(Math.max(xStart, xEnd));

        // Keep the same pixel-scan style as the other movement probes. It is not
        // the fastest approach, but it keeps this first port easy to compare.
        for (let x = start; x <= end; x += 1) {
            const tileX = Math.floor(x / this.layer.tilemap.tileWidth);

            if (this.tileCoordinates.has(this.makeTileKey(tileX, tileY))) {
                return true;
            }
        }

        return false;
    }

    private createSpritesFromLayer(): void
    {
        this.layer.forEachTile((tile) => {
            if (!this.isVanishingPlatformTile(tile)) {
                return;
            }

            this.tileCoordinates.add(this.makeTileKey(tile.x, tile.y));

            const sprite = this.scene.add.sprite(
                tile.x * this.layer.tilemap.tileWidth,
                tile.y * this.layer.tilemap.tileHeight,
                this.textureKey,
                this.frameIndex
            )
                .setOrigin(0, 0)
                .setDepth(this.layer.depth + 1);

            this.sprites.push(sprite);

            // Replace the static tile with a transparent tile. The sprite above
            // now owns the visual animation, while this class owns the collision.
            this.layer.putTileAt(VanishingPlatforms.BLANK_TILE_INDEX, tile.x, tile.y);
        });
    }

    private isVanishingPlatformTile(tile: Tilemaps.Tile): boolean
    {
        return tile.properties?.[VanishingPlatforms.TILED_PROPERTY_NAME] ===
            VanishingPlatforms.TILE_NAME_VANISHING_PLATFORM;
    }

    private makeTileKey(tileX: number, tileY: number): string
    {
        return `${tileX},${tileY}`;
    }
}
