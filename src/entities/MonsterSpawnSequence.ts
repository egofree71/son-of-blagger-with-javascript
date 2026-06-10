import type { GameObjects, Scene } from "phaser";
import { MonsterManager, type MonsterSpawnPoint } from "./MonsterManager";
import { EXPLOSION_EFFECT_FRAME_COUNT, EXPLOSION_EFFECT_FRAME_DURATION_MS } from "../config/SequenceAnimation";

/**
 * Reveals monsters with an explosion effect before gameplay starts.
 *
 * Monsters are hidden and harmless while the effect plays. When the last
 * explosion frame has been shown, the sequence calls back into GameScene so the
 * monsters can become visible, active and dangerous.
 */
export class MonsterSpawnSequence
{
    private static readonly SPRITE_DEPTH = 12;

    private readonly scene: Scene;
    private readonly monsterManager: MonsterManager;
    private readonly explosionTextureKey: string;
    private readonly explosions: GameObjects.Sprite[] = [];
    private elapsedFrameTimeMs = 0;
    private frameIndex = 0;
    private playing = false;
    private onComplete?: () => void;

    /**
     * @param scene Gameplay scene that owns the explosion sprites.
     * @param monsterManager Monsters that should be hidden and revealed.
     * @param explosionTextureKey Spritesheet key for the reveal explosion.
     */
    constructor(scene: Scene, monsterManager: MonsterManager, explosionTextureKey: string)
    {
        this.scene = scene;
        this.monsterManager = monsterManager;
        this.explosionTextureKey = explosionTextureKey;
    }

    /**
     * Hides monsters and starts one explosion at each monster spawn point.
     */
    start(onComplete: () => void): void
    {
        this.stop();
        this.onComplete = onComplete;
        this.monsterManager.prepareForSpawnReveal();

        const spawnPoints = this.monsterManager.getSpawnPoints();

        if (spawnPoints.length === 0) {
            this.finish();
            return;
        }

        this.playing = true;
        this.elapsedFrameTimeMs = 0;
        this.frameIndex = 0;
        this.createExplosionSprites(spawnPoints);
    }

    /**
     * Advances the shared explosion frames.
     */
    update(deltaMs: number): void
    {
        if (!this.playing) {
            return;
        }

        this.elapsedFrameTimeMs += deltaMs;

        while (this.elapsedFrameTimeMs >= EXPLOSION_EFFECT_FRAME_DURATION_MS) {
            this.elapsedFrameTimeMs -= EXPLOSION_EFFECT_FRAME_DURATION_MS;
            this.frameIndex += 1;

            if (this.frameIndex >= EXPLOSION_EFFECT_FRAME_COUNT) {
                this.finish();
                return;
            }

            this.setExplosionFrame(this.frameIndex);
        }
    }

    /**
     * Stops the reveal and destroys any remaining explosion sprites.
     */
    stop(): void
    {
        this.playing = false;
        this.elapsedFrameTimeMs = 0;
        this.frameIndex = 0;
        this.destroyExplosionSprites();
    }

    /**
     * Reports whether gameplay should still be blocked by the reveal.
     */
    isPlaying(): boolean
    {
        return this.playing;
    }

    private createExplosionSprites(spawnPoints: readonly MonsterSpawnPoint[]): void
    {
        for (const spawnPoint of spawnPoints) {
            const explosion = this.scene.add.sprite(spawnPoint.x, spawnPoint.y, this.explosionTextureKey, 0)
                .setOrigin(0, 0)
                .setDepth(MonsterSpawnSequence.SPRITE_DEPTH);

            this.explosions.push(explosion);
        }
    }

    private setExplosionFrame(frameIndex: number): void
    {
        for (const explosion of this.explosions) {
            explosion.setFrame(frameIndex);
        }
    }

    private finish(): void
    {
        const completeCallback = this.onComplete;

        this.stop();
        this.onComplete = undefined;
        completeCallback?.();
    }

    private destroyExplosionSprites(): void
    {
        for (const explosion of this.explosions) {
            explosion.destroy();
        }

        this.explosions.length = 0;
    }
}
