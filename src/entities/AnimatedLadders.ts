import type { GameObjects, Scene, Tilemaps } from "phaser";

/**
 * Creates the animated ladder overlays used by the Phaser 4 prototype.
 *
 * The original Phaser 2 startup generated sprites from the two ladder tiles in
 * the Tiled background layer and replaced the static tiles visually. This class
 * keeps the same idea: the map still provides ladder collision data, while the
 * static ladder tiles are hidden and animated sprites draw the moving rungs.
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
     * Advances all ladder overlays using the same frame cadence as Phaser 2.
     */
    update(deltaMs: number): void
    {
        if (this.sprites.length === 0) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        if (this.elapsedFrameTimeMs < AnimatedLadders.FRAME_DURATION_MS) {
            return;
        }

        const framesToAdvance = Math.floor(this.elapsedFrameTimeMs / AnimatedLadders.FRAME_DURATION_MS);
        this.elapsedFrameTimeMs %= AnimatedLadders.FRAME_DURATION_MS;
        this.frameIndex = (this.frameIndex + framesToAdvance) % AnimatedLadders.FRAME_COUNT;

        for (const sprite of this.sprites) {
            sprite.setFrame(this.frameIndex);
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

            // Phaser 2's createFromTiles replaced the static ladder tile after
            // creating the animated sprite. Here we hide the original tile
            // instead, so the visual duplication disappears while the ladder
            // properties remain available to the movement probes.
            tile.setVisible(false);
        });
    }

    private isLadderTile(tile: Tilemaps.Tile): boolean
    {
        return tile.properties?.[AnimatedLadders.TILED_PROPERTY_NAME] === AnimatedLadders.TILE_NAME_LADDER;
    }

    private getTextureKeyForTile(tile: Tilemaps.Tile): string | null
    {
        // The C64 ladder is made from two 16px Tiled cells. Phaser 2 used tile
        // indices 28 and 29 to choose the left and right animated spritesheets.
        if (tile.index === AnimatedLadders.LEFT_LADDER_TILE_INDEX) {
            return this.leftTextureKey;
        }

        if (tile.index === AnimatedLadders.RIGHT_LADDER_TILE_INDEX) {
            return this.rightTextureKey;
        }

        return null;
    }
}
