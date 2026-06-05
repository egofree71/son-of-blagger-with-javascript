import type { GameObjects, Scene } from "phaser";
import type { TiledObjectLike } from "../tiled/tiledObjects";

/**
 * Minimal Phaser 4 player entity used by the modernization prototype.
 *
 * This is not the final gameplay controller yet. For now it owns only the
 * visible sprite and knows how to place it on the Tiled player start object. The
 * movement rules, animation timing, collision probes and death flow will be
 * ported later from the Phaser 2 implementation in smaller steps.
 */
export class Player
{
    /**
     * Tiled stores the player start at the bottom of the original 42px sprite.
     * The Phaser 2 implementation subtracts this value when resetting the player;
     * the prototype keeps the same offset so the marker appears at the same spot.
     */
    private static readonly TILED_Y_OFFSET = 42;

    private readonly sprite: GameObjects.Image;

    constructor(scene: Scene, textureKey: string)
    {
        this.sprite = scene.add.image(0, 0, textureKey)
            .setOrigin(0, 0)
            .setVisible(false);
    }

    /**
     * Places the player sprite on the current level start object.
     */
    resetToTiledStart(startObject: TiledObjectLike): void
    {
        this.sprite.setPosition(
            startObject.x,
            startObject.y - Player.TILED_Y_OFFSET
        );

        this.sprite.setVisible(true);
    }

    /**
     * Returns the visual center of the sprite for camera placement.
     */
    getCenter(): { x: number; y: number }
    {
        return {
            x: this.sprite.x + this.sprite.displayWidth / 2,
            y: this.sprite.y + this.sprite.displayHeight / 2
        };
    }

    /**
     * Exposes the Phaser image only for scene-level camera/debug helpers.
     * Gameplay code should grow behaviour-focused methods before it manipulates
     * the player directly.
     */
    getSprite(): GameObjects.Image
    {
        return this.sprite;
    }
}
