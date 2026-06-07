import type { GameObjects, Scene } from "phaser";
import { MonsterManager, type MonsterSpawnPoint } from "./MonsterManager";

/**
 * Plays the temporary monster reveal effect before gameplay starts.
 *
 * The original game hides each monster, plays an explosion at its spawn
 * position, then makes all monsters visible when the reveal has finished. The
 * Phaser 4 prototype keeps that behaviour as a small update-driven sequence so
 * GameScene can simply block gameplay while the effect is active.
 */
export class MonsterSpawnSequence
{
    private static readonly FRAME_RATE = 18;
    private static readonly FRAME_COUNT = 15;
    private static readonly SPRITE_DEPTH = 12;
    private static readonly FRAME_DURATION_MS = 1000 / MonsterSpawnSequence.FRAME_RATE;

    private readonly scene: Scene;
    private readonly monsterManager: MonsterManager;
    private readonly explosionTextureKey: string;
    private readonly explosions: GameObjects.Sprite[] = [];
    private elapsedFrameTimeMs = 0;
    private frameIndex = 0;
    private playing = false;
    private onComplete?: () => void;

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

        while (this.elapsedFrameTimeMs >= MonsterSpawnSequence.FRAME_DURATION_MS) {
            this.elapsedFrameTimeMs -= MonsterSpawnSequence.FRAME_DURATION_MS;
            this.frameIndex += 1;

            if (this.frameIndex >= MonsterSpawnSequence.FRAME_COUNT) {
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
