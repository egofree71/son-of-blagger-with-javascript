import type { GameObjects, Scene, Tilemaps } from "phaser";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { overlapsActiveRegions } from "../optimization/LevelActiveRegions";
import { LEVEL_OBJECT_ANIMATION_FRAME_COUNT, LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS } from "../config/LevelObjectAnimation";

interface ConveyorTileEntry
{
    worldX: number;
    worldY: number;
    textureKey: string;
    sprite?: GameObjects.Sprite;
}

/**
 * Draws the animated conveyor belts above the static Tiled map.
 *
 * Conveyor tiles keep their Tiled properties so the player movement code can
 * still read their direction. The class now stores lightweight tile entries for
 * the whole map, but only creates Phaser sprites for the active level regions.
 */
export class AnimatedConveyors
{
    private static readonly LEFT_CONVEYOR_TILE_INDEX = 16;
    private static readonly RIGHT_CONVEYOR_TILE_INDEX = 17;

    private readonly entries: ConveyorTileEntry[] = [];
    private activeSprites: GameObjects.Sprite[] = [];
    private frameIndex = 0;
    private elapsedFrameTimeMs = 0;

    /**
     * @param scene Scene that owns the conveyor overlay sprites.
     * @param layer Tiled background layer scanned for conveyor tiles.
     * @param leftTextureKey Spritesheet key used for left-moving belts.
     * @param rightTextureKey Spritesheet key used for right-moving belts.
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
     * Advances active conveyor overlays using elapsed time rather than update count.
     */
    update(deltaMs: number): void
    {
        if (this.activeSprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS) {
            return;
        }

        // A browser frame can be longer than one animation frame. Advance by the
        // full number of elapsed conveyor frames and keep the leftover time so
        // the belt animation stays smooth and does not drift.
        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS;

        // Wrap the shared frame index because all conveyor sprites use the same
        // eight-frame loop.
        this.frameIndex = (this.frameIndex + framesToAdvance) % LEVEL_OBJECT_ANIMATION_FRAME_COUNT;

        for (const sprite of this.activeSprites) {
            sprite.setFrame(this.frameIndex);
        }
    }

    /**
     * Creates sprites only for overlays belonging to the currently active levels.
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

            // Hide the static conveyor art, but keep the tile itself in the map:
            // its properties are still used to push Sid left or right.
            tile.setVisible(false);
        });
    }

    private getOrCreateSprite(entry: ConveyorTileEntry): GameObjects.Sprite
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

    private destroySprite(entry: ConveyorTileEntry): void
    {
        entry.sprite?.destroy();
        entry.sprite = undefined;
    }

    private getTextureKeyForTile(tile: Tilemaps.Tile): string | null
    {
        // The imported map uses two tile indices to distinguish belt direction.
        if (tile.index === AnimatedConveyors.LEFT_CONVEYOR_TILE_INDEX) {
            return this.leftTextureKey;
        }

        if (tile.index === AnimatedConveyors.RIGHT_CONVEYOR_TILE_INDEX) {
            return this.rightTextureKey;
        }

        return null;
    }
}
