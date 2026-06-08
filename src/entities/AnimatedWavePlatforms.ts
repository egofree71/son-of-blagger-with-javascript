import type { GameObjects, Scene, Tilemaps } from "phaser";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { overlapsActiveRegions } from "../optimization/LevelActiveRegions";

/**
 * Draws animated wave-platform overlays above solid map tiles.
 *
 * Wave platform tiles remain in the map for collision. This class only hides
 * their static art and replaces it with the animated left/right wave sprites.
 */
export class AnimatedWavePlatforms
{
    private static readonly LEFT_WAVE_TILE_INDEX = 31;
    private static readonly RIGHT_WAVE_TILE_INDEX = 32;
    private static readonly FRAME_COUNT = 8;
    private static readonly FRAME_DURATION_MS = 1000 / 30;

    private readonly sprites: GameObjects.Sprite[] = [];
    private activeSprites: GameObjects.Sprite[] = [];
    private frameIndex = 0;
    private elapsedFrameTimeMs = 0;

    /**
     * @param scene Scene that owns the wave overlay sprites.
     * @param layer Tiled background layer scanned for wave-platform tiles.
     * @param leftTextureKey Spritesheet key used for the left wave tile.
     * @param rightTextureKey Spritesheet key used for the right wave tile.
     */
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
     * Advances all wave overlays using elapsed time rather than update count.
     */
    update(deltaMs: number): void
    {
        if (this.activeSprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < AnimatedWavePlatforms.FRAME_DURATION_MS) {
            return;
        }

        // Consume every complete animation step since the previous update. This
        // keeps the visual loop stable when the browser misses a frame.
        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / AnimatedWavePlatforms.FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= AnimatedWavePlatforms.FRAME_DURATION_MS;
        this.frameIndex = (this.frameIndex + framesToAdvance) % AnimatedWavePlatforms.FRAME_COUNT;

        for (const sprite of this.activeSprites) {
            sprite.setFrame(this.frameIndex);
        }
    }

    /**
     * Keeps only the overlays belonging to the current level visible and updated.
     */
    setActiveRegions(activeRegions: readonly ActiveRegion[]): void
    {
        this.activeSprites = [];

        for (const sprite of this.sprites) {
            const active = overlapsActiveRegions(
                sprite.x,
                sprite.y,
                this.layer.tilemap.tileWidth,
                this.layer.tilemap.tileHeight,
                activeRegions
            );

            sprite.setActive(active);
            sprite.setVisible(active);

            if (active) {
                this.activeSprites.push(sprite);
            }
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
            this.activeSprites.push(sprite);

            // The hidden tile still provides solid-platform collision; only its
            // static drawing is replaced by the animated sprite.
            tile.setVisible(false);
        });
    }

    private getTextureKeyForTile(tile: Tilemaps.Tile): string | null
    {
        // The imported map stores the two wave halves as two tile ids.
        if (tile.index === AnimatedWavePlatforms.LEFT_WAVE_TILE_INDEX) {
            return this.leftTextureKey;
        }

        if (tile.index === AnimatedWavePlatforms.RIGHT_WAVE_TILE_INDEX) {
            return this.rightTextureKey;
        }

        return null;
    }
}
