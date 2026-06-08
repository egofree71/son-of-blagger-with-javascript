import type { GameObjects, Scene, Tilemaps } from "phaser";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { overlapsActiveRegions } from "../optimization/LevelActiveRegions";

interface WavePlatformTileEntry
{
    worldX: number;
    worldY: number;
    textureKey: string;
    sprite?: GameObjects.Sprite;
}

/**
 * Draws animated wave-platform overlays above solid map tiles.
 *
 * Wave platform tiles remain in the map for collision. This class hides their
 * static art, records their map positions, and creates visible Phaser sprites
 * only for active level regions.
 */
export class AnimatedWavePlatforms
{
    private static readonly LEFT_WAVE_TILE_INDEX = 31;
    private static readonly RIGHT_WAVE_TILE_INDEX = 32;
    private static readonly FRAME_COUNT = 8;
    private static readonly FRAME_DURATION_MS = 1000 / 30;

    private readonly entries: WavePlatformTileEntry[] = [];
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
        this.createEntriesFromLayer();
    }

    /**
     * Advances active wave overlays using elapsed time rather than update count.
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
     * Creates sprites only for wave overlays belonging to the active levels.
     */
    setActiveRegions(activeRegions: readonly ActiveRegion[]): void
    {
        this.activeSprites = [];

        for (const entry of this.entries) {
            const active = overlapsActiveRegions(
                entry.worldX,
                entry.worldY,
                this.layer.tilemap.tileWidth,
                this.layer.tilemap.tileHeight,
                activeRegions
            );

            if (!active) {
                this.destroySprite(entry);
                continue;
            }

            const sprite = this.getOrCreateSprite(entry);
            this.activeSprites.push(sprite);
        }
    }

    private createEntriesFromLayer(): void
    {
        this.layer.forEachTile((tile) => {
            const textureKey = this.getTextureKeyForTile(tile);

            if (!textureKey) {
                return;
            }

            this.entries.push({
                worldX: tile.x * this.layer.tilemap.tileWidth,
                worldY: tile.y * this.layer.tilemap.tileHeight,
                textureKey
            });

            // The hidden tile still provides solid-platform collision; only its
            // static drawing is replaced by the animated sprite.
            tile.setVisible(false);
        });
    }

    private getOrCreateSprite(entry: WavePlatformTileEntry): GameObjects.Sprite
    {
        if (entry.sprite) {
            return entry.sprite;
        }

        entry.sprite = this.scene.add.sprite(
            entry.worldX,
            entry.worldY,
            entry.textureKey,
            this.frameIndex
        )
            .setOrigin(0, 0)
            .setDepth(this.layer.depth + 1);

        return entry.sprite;
    }

    private destroySprite(entry: WavePlatformTileEntry): void
    {
        entry.sprite?.destroy();
        entry.sprite = undefined;
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
