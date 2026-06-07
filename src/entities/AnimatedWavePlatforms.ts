import type { GameObjects, Scene, Tilemaps } from "phaser";

/**
 * Creates the animated wave-platform overlays used by the Phaser 4 prototype.
 *
 * Phaser 2 generated these decorative wave sprites from two solid Tiled tiles.
 * The Phaser 4 prototype keeps the same split: the map tiles still provide the
 * solid platform collision data, while this class hides the static tile art and
 * draws the animated wave sprites on top.
 */
export class AnimatedWavePlatforms
{
    private static readonly LEFT_WAVE_TILE_INDEX = 31;
    private static readonly RIGHT_WAVE_TILE_INDEX = 32;
    private static readonly FRAME_COUNT = 8;
    private static readonly FRAME_DURATION_MS = 1000 / 30;

    private readonly sprites: GameObjects.Sprite[] = [];
    private frameIndex = 0;
    private elapsedFrameTimeMs = 0;

    constructor(
        private readonly scene: Scene,
        private readonly layer: Tilemaps.TilemapLayerBase,
        private readonly leftTextureKey: string,
        private readonly rightTextureKey: string
    )
    {
        this.createSpritesFromLayer();
    }

    /**
     * Advances all wave-platform overlays using the Phaser 2 visual cadence.
     */
    update(deltaMs: number): void
    {
        if (this.sprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < AnimatedWavePlatforms.FRAME_DURATION_MS) {
            return;
        }

        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / AnimatedWavePlatforms.FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= AnimatedWavePlatforms.FRAME_DURATION_MS;
        this.frameIndex = (this.frameIndex + framesToAdvance) % AnimatedWavePlatforms.FRAME_COUNT;

        for (const sprite of this.sprites) {
            sprite.setFrame(this.frameIndex);
        }
    }

    private createSpritesFromLayer(): void
    {
        this.layer.forEachTile((tile) => {
            const textureKey = this.getTextureKeyForTile(tile);

            if (!textureKey) {
                return;
            }

            const sprite = this.scene.add.sprite(
                tile.x * this.layer.tilemap.tileWidth,
                tile.y * this.layer.tilemap.tileHeight,
                textureKey,
                this.frameIndex
            )
                .setOrigin(0, 0)
                .setDepth(this.layer.depth + 1);

            this.sprites.push(sprite);

            // Hide the static wave tile after creating the overlay. The tile
            // stays in the map so its solid property still supports collision.
            tile.setVisible(false);
        });
    }

    private getTextureKeyForTile(tile: Tilemaps.Tile): string | null
    {
        // Phaser 2's createSpritesFromTiles used tile indices 31 and 32 for the
        // two halves of this animated platform decoration.
        if (tile.index === AnimatedWavePlatforms.LEFT_WAVE_TILE_INDEX) {
            return this.leftTextureKey;
        }

        if (tile.index === AnimatedWavePlatforms.RIGHT_WAVE_TILE_INDEX) {
            return this.rightTextureKey;
        }

        return null;
    }
}
