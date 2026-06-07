import type { GameObjects, Scene, Tilemaps } from "phaser";

/**
 * Draws the animated conveyor belts above the static Tiled map.
 *
 * Conveyor tiles keep their Tiled properties so the player movement code can
 * still read their direction. This class only replaces the visible tile art with
 * animated sprites that share one frame counter.
 */
export class AnimatedConveyors
{
    private static readonly LEFT_CONVEYOR_TILE_INDEX = 16;
    private static readonly RIGHT_CONVEYOR_TILE_INDEX = 17;
    private static readonly FRAME_COUNT = 8;
    private static readonly FRAME_DURATION_MS = 1000 / 30;

    private readonly sprites: GameObjects.Sprite[] = [];
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
        this.createSpritesFromLayer();
    }

    /**
     * Advances all conveyor overlays using elapsed time rather than update count.
     */
    update(deltaMs: number): void
    {
        if (this.sprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < AnimatedConveyors.FRAME_DURATION_MS) {
            return;
        }

        // A browser frame can be longer than one animation frame. Advance by the
        // full number of elapsed conveyor frames and keep the leftover time so
        // the belt animation stays smooth and does not drift.
        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / AnimatedConveyors.FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= AnimatedConveyors.FRAME_DURATION_MS;

        // Wrap the shared frame index because all conveyor sprites use the same
        // eight-frame loop.
        this.frameIndex = (this.frameIndex + framesToAdvance) % AnimatedConveyors.FRAME_COUNT;

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

            // Hide the static conveyor art, but keep the tile itself in the map:
            // its properties are still used to push Sid left or right.
            tile.setVisible(false);
        });
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
