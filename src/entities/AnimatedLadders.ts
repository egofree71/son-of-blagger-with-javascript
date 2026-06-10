import type { GameObjects, Scene, Tilemaps } from "phaser";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { overlapsActiveRegions } from "../optimization/LevelActiveRegions";
import { LEVEL_OBJECT_ANIMATION_FRAME_COUNT, LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS } from "../config/LevelObjectAnimation";

interface LadderTileEntry
{
    worldX: number;
    worldY: number;
    textureKey: string;
    sprite?: GameObjects.Sprite;
}

/**
 * Draws animated ladder rungs above the static Tiled map.
 *
 * Ladder tiles remain in the background layer so movement probes can still find
 * them. The static tile art is hidden once, while Phaser sprites are created
 * only for the current active regions.
 */
export class AnimatedLadders
{
    private static readonly TILE_NAME_LADDER = "ladder";
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly LEFT_LADDER_TILE_INDEX = 28;
    private static readonly RIGHT_LADDER_TILE_INDEX = 29;

    private readonly entries: LadderTileEntry[] = [];
    private activeSprites: GameObjects.Sprite[] = [];
    private frameIndex = 0;
    private elapsedFrameTimeMs = 0;

    /**
     * @param scene Scene that owns the ladder overlay sprites.
     * @param layer Tiled background layer scanned for ladder tiles.
     * @param leftTextureKey Spritesheet key used for the left ladder half.
     * @param rightTextureKey Spritesheet key used for the right ladder half.
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
     * Advances active ladder overlays using elapsed time rather than update count.
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

        // Long browser frames can cover several ladder animation frames. Consume
        // all complete frames and keep the remainder for the next update.
        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS;
        this.frameIndex = (this.frameIndex + framesToAdvance) % LEVEL_OBJECT_ANIMATION_FRAME_COUNT;

        for (const sprite of this.activeSprites) {
            sprite.setFrame(this.frameIndex);
        }
    }

    /**
     * Creates sprites only for ladder overlays belonging to the active levels.
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
            if (!this.isLadderTile(tile)) {
                return;
            }

            const textureKey = this.getTextureKeyForTile(tile);

            if (!textureKey) {
                return;
            }

            this.entries.push({
                worldX: tile.x * this.layer.tilemap.tileWidth,
                worldY: tile.y * this.layer.tilemap.tileHeight,
                textureKey
            });

            // Hide only the static artwork. The tile stays present so the ladder
            // probes can still detect it during player movement.
            tile.setVisible(false);
        });
    }

    private getOrCreateSprite(entry: LadderTileEntry): GameObjects.Sprite
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

    private destroySprite(entry: LadderTileEntry): void
    {
        entry.sprite?.destroy();
        entry.sprite = undefined;
    }

    private isLadderTile(tile: Tilemaps.Tile): boolean
    {
        return tile.properties?.[AnimatedLadders.TILED_PROPERTY_NAME] === AnimatedLadders.TILE_NAME_LADDER;
    }

    private getTextureKeyForTile(tile: Tilemaps.Tile): string | null
    {
        // The imported map stores the two visual ladder halves as two tile ids.
        if (tile.index === AnimatedLadders.LEFT_LADDER_TILE_INDEX) {
            return this.leftTextureKey;
        }

        if (tile.index === AnimatedLadders.RIGHT_LADDER_TILE_INDEX) {
            return this.rightTextureKey;
        }

        return null;
    }
}
