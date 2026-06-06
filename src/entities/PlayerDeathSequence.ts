import type { GameObjects, Scene } from "phaser";
import type { Player } from "./Player";

/**
 * Plays the temporary Phaser 4 visual death sequence for Slippery Sid.
 *
 * The class owns only the short death sprite animation. GameScene still owns the
 * prototype consequences of death, such as resetting the player, clearing keys
 * and updating the temporary HUD. This mirrors the Phaser 2 split where the
 * death sequence handles visuals and the game flow handles state changes.
 */
export class PlayerDeathSequence
{
    private static readonly DYING_SPRITE_Y_OFFSET = 1;
    private static readonly SPRITE_DEPTH = 11;
    private static readonly FRAME_COUNT = 8;
    private static readonly FRAME_RATE = 6;
    private static readonly FRAME_DURATION_MS = 1000 / PlayerDeathSequence.FRAME_RATE;

    private dyingSprite?: GameObjects.Sprite;
    private elapsedMs = 0;
    private frameIndex = 0;
    private completeCallback?: () => void;

    constructor(
        private readonly scene: Scene,
        private readonly textureKey: string
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

        this.dyingSprite = this.scene.add.sprite(
            origin.x,
            origin.y - PlayerDeathSequence.DYING_SPRITE_Y_OFFSET,
            this.textureKey,
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
     * Advances the frame-based death animation.
     */
    update(deltaMs: number): void
    {
        if (!this.dyingSprite) {
            return;
        }

        this.elapsedMs += deltaMs;

        while (this.elapsedMs >= PlayerDeathSequence.FRAME_DURATION_MS) {
            this.elapsedMs -= PlayerDeathSequence.FRAME_DURATION_MS;
            this.frameIndex += 1;

            if (this.frameIndex >= PlayerDeathSequence.FRAME_COUNT) {
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

        // The callback owns state consequences. Destroy the temporary sprite
        // first so the normal player can be shown immediately at the start point.
        callback?.();
    }
}
