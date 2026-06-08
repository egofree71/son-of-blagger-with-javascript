import type { GameObjects, Scene, Tilemaps } from "phaser";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { overlapsActiveRegions } from "../optimization/LevelActiveRegions";

interface VanishingPlatformEntry
{
    worldX: number;
    worldY: number;
    tileX: number;
    tileY: number;
    sprite?: GameObjects.Sprite;
}

/**
 * Manages animated platforms that periodically stop supporting the player.
 *
 * The static Tiled tiles mark where these platforms live. They are replaced by
 * transparent map tiles during setup, but Phaser sprites and collision entries
 * are kept only for the active level regions.
 */
export class VanishingPlatforms
{
    private static readonly TILE_NAME_VANISHING_PLATFORM = "vanishing platform";
    private static readonly TILED_PROPERTY_NAME = "name";
    private static readonly BLANK_TILE_INDEX = 30;
    private static readonly FRAME_COUNT = 8;
    private static readonly NON_COLLIDING_FRAME = 4;
    // Two animation frames per second gives the platform its slow blink. Using
    // elapsed milliseconds keeps that speed stable on high-refresh displays.
    private static readonly FRAME_DURATION_MS = 500;

    private readonly activeTileCoordinates = new Set<string>();
    private readonly platforms: VanishingPlatformEntry[] = [];
    private activeSprites: GameObjects.Sprite[] = [];
    private frameIndex = 0;
    private elapsedFrameTimeMs = 0;

    /**
     * @param scene Scene that owns the replacement platform sprites.
     * @param layer Tiled background layer scanned for vanishing-platform tiles.
     * @param textureKey Spritesheet key used for the platform animation.
     */
    constructor(
        private readonly scene: Scene,
        private readonly layer: Tilemaps.TilemapLayerBase,
        private readonly textureKey: string
    )
    {
        this.createEntriesFromLayer();
    }

    /**
     * Advances the shared vanishing-platform animation by elapsed time.
     */
    update(deltaMs: number): void
    {
        if (this.activeSprites.length === 0) {
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

        for (const sprite of this.activeSprites) {
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

        // The foot probe must be exactly on the tile top edge. This prevents Sid
        // from catching the platform while passing through its side or underside.
        if (Math.floor(y) !== tileTopY) {
            return false;
        }

        const start = Math.floor(Math.min(xStart, xEnd));
        const end = Math.floor(Math.max(xStart, xEnd));
        const tileWidth = this.layer.tilemap.tileWidth;
        const startTileX = Math.floor(start / tileWidth);
        const endTileX = Math.floor(end / tileWidth);

        // Vanishing platforms occupy whole tile cells, so scanning the tile
        // columns crossed by the foot line is enough. Boundary contacts are still
        // preserved because both crossed columns are included.
        for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
            if (this.activeTileCoordinates.has(this.makeTileKey(tileX, tileY))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Creates sprites and collision entries only for active replacement platforms.
     */
    setActiveRegions(activeRegions: readonly ActiveRegion[]): void
    {
        this.activeSprites = [];
        this.activeTileCoordinates.clear();

        for (const platform of this.platforms) {
            const active = overlapsActiveRegions(
                platform.worldX,
                platform.worldY,
                this.layer.tilemap.tileWidth,
                this.layer.tilemap.tileHeight,
                activeRegions
            );

            if (!active) {
                this.destroySprite(platform);
                continue;
            }

            const sprite = this.getOrCreateSprite(platform);
            this.activeSprites.push(sprite);
            this.activeTileCoordinates.add(this.makeTileKey(platform.tileX, platform.tileY));
        }
    }

    private createEntriesFromLayer(): void
    {
        this.layer.forEachTile((tile) => {
            if (!this.isVanishingPlatformTile(tile)) {
                return;
            }

            this.platforms.push({
                worldX: tile.x * this.layer.tilemap.tileWidth,
                worldY: tile.y * this.layer.tilemap.tileHeight,
                tileX: tile.x,
                tileY: tile.y
            });

            // Replace the static tile with a transparent tile. The sprite above
            // now owns the visual animation, while this class owns the collision.
            this.layer.putTileAt(VanishingPlatforms.BLANK_TILE_INDEX, tile.x, tile.y);
        });
    }

    private getOrCreateSprite(platform: VanishingPlatformEntry): GameObjects.Sprite
    {
        if (platform.sprite) {
            return platform.sprite;
        }

        platform.sprite = this.scene.add.sprite(
            platform.worldX,
            platform.worldY,
            this.textureKey,
            this.frameIndex
        )
            .setOrigin(0, 0)
            .setDepth(this.layer.depth + 1);

        return platform.sprite;
    }

    private destroySprite(platform: VanishingPlatformEntry): void
    {
        platform.sprite?.destroy();
        platform.sprite = undefined;
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
