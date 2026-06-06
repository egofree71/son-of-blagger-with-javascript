import type { GameObjects, Scene, Tilemaps } from "phaser";

/**
 * Creates the animated conveyor-belt overlays used by the Phaser 4 prototype.
 *
 * Phaser 2 generated these sprites from the static Tiled conveyor tiles. The
 * prototype keeps the same split: the Tiled layer remains the movement/collision
 * source of truth, while this class owns only the animated visual belt strips.
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
     * Advances all conveyor overlays using the same frame cadence as Phaser 2.
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

        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / AnimatedConveyors.FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= AnimatedConveyors.FRAME_DURATION_MS;
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

            // Hide the static conveyor tile after creating the overlay. Keeping
            // the tile in the map preserves its Tiled properties for movement.
            tile.setVisible(false);
        });
    }

    private getTextureKeyForTile(tile: Tilemaps.Tile): string | null
    {
        // Phaser 2's createSpritesFromTiles used tile indices 16 and 17 for the
        // two belt directions, so keep those map conventions here.
        if (tile.index === AnimatedConveyors.LEFT_CONVEYOR_TILE_INDEX) {
            return this.leftTextureKey;
        }

        if (tile.index === AnimatedConveyors.RIGHT_CONVEYOR_TILE_INDEX) {
            return this.rightTextureKey;
        }

        return null;
    }
}
