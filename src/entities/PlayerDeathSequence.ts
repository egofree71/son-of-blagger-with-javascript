import type { GameObjects, Scene } from "phaser";
import type { Player } from "./Player";
import { PLAYER_DEATH_ANIMATION_FRAME_COUNT, PLAYER_DEATH_ANIMATION_FRAME_DURATION_MS } from "../config/SequenceAnimation";

/**
 * Plays Sid's short visual death animation.
 *
 * This class owns only the sprite animation. GameScene owns the consequences of
 * death, such as resetting the level runtime, updating lives and refreshing the
 * HUD.
 */
export class PlayerDeathSequence
{
    private static readonly DYING_SPRITE_Y_OFFSET = 1;
    private static readonly SPRITE_DEPTH = 11;

    private dyingSprite?: GameObjects.Sprite;
    private elapsedMs = 0;
    private frameIndex = 0;
    private completeCallback?: () => void;

    /**
     * @param scene Gameplay scene that owns the death animation sprite.
     * @param normalTextureKey Spritesheet key for the regular death animation.
     * @param deadlyFallTextureKey Spritesheet key for the white deadly-fall variant.
     */
    constructor(
        private readonly scene: Scene,
        private readonly normalTextureKey: string,
        private readonly deadlyFallTextureKey: string
    )
    {
    }

    /**
     * Starts the death animation from the current player position.
     */
    start(player: Player, onComplete: () => void): void
    {
        this.dyingSprite?.destroy();

        const origin = player.getDeathAnimationOrigin();
        player.hideForDeathAnimation();

        this.elapsedMs = 0;
        this.frameIndex = 0;
        this.completeCallback = onComplete;

        const textureKey = player.isDeadlyFall()
            ? this.deadlyFallTextureKey
            : this.normalTextureKey;

        this.dyingSprite = this.scene.add.sprite(
            origin.x,
            origin.y - PlayerDeathSequence.DYING_SPRITE_Y_OFFSET,
            textureKey,
            0
        )
            .setOrigin(0, 0)
            .setDepth(PlayerDeathSequence.SPRITE_DEPTH);
    }

    /**
     * Returns whether the visual sequence is currently blocking gameplay.
     */
    isPlaying(): boolean
    {
        return this.dyingSprite !== undefined;
    }

    /**
     * Advances the sprite-frame death animation from elapsed milliseconds.
     */
    update(deltaMs: number): void
    {
        if (!this.dyingSprite) {
            return;
        }

        this.elapsedMs += deltaMs;

        while (this.elapsedMs >= PLAYER_DEATH_ANIMATION_FRAME_DURATION_MS) {
            this.elapsedMs -= PLAYER_DEATH_ANIMATION_FRAME_DURATION_MS;
            this.frameIndex += 1;

            if (this.frameIndex >= PLAYER_DEATH_ANIMATION_FRAME_COUNT) {
                this.finish();
                return;
            }

            this.dyingSprite.setFrame(this.frameIndex);
        }
    }

    private finish(): void
    {
        this.dyingSprite?.destroy();
        this.dyingSprite = undefined;

        const callback = this.completeCallback;
        this.completeCallback = undefined;

        // Destroy the death sprite before the callback shows the normal player
        // again at the level start point.
        callback?.();
    }
}
