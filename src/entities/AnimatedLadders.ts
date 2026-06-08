import type { GameObjects, Scene, Tilemaps } from "phaser";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { overlapsActiveRegions } from "../optimization/LevelActiveRegions";

/**
 * Draws animated ladder rungs above the static Tiled map.
 *
 * Ladder tiles remain in the background layer so movement probes can still find
 * them. This class hides the static tile art and places animated sprites at the
 * same grid positions.
 */
export class AnimatedLadders
{
    private static readonly TILE_NAME_LADDER = "ladder";
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly LEFT_LADDER_TILE_INDEX = 28;
    private static readonly RIGHT_LADDER_TILE_INDEX = 29;
    private static readonly FRAME_COUNT = 8;
    private static readonly FRAME_DURATION_MS = 1000 / 30;

    private readonly sprites: GameObjects.Sprite[] = [];
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
        this.createSpritesFromLayer();
    }

    /**
     * Advances all ladder overlays using elapsed time rather than update count.
     */
    update(deltaMs: number): void
    {
        if (this.activeSprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < AnimatedLadders.FRAME_DURATION_MS) {
            return;
        }

        // Long browser frames can cover several ladder animation frames. Consume
        // all complete frames and keep the remainder for the next update.
        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / AnimatedLadders.FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= AnimatedLadders.FRAME_DURATION_MS;
        this.frameIndex = (this.frameIndex + framesToAdvance) % AnimatedLadders.FRAME_COUNT;

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
            if (!this.isLadderTile(tile)) {
                return;
            }

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

            // Hide only the static artwork. The tile stays present so the ladder
            // probes can still detect it during player movement.
            tile.setVisible(false);
        });
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
