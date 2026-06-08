import type { Scene } from "phaser";

interface SoundEffectDefinition
{
    key: string;
    path: string;
}

interface SoundEffectOptions
{
    volume?: number;
}

/**
 * Centralizes the short gameplay sounds restored from the old GameMaker project.
 *
 * The original archive also contains `snd_black_and_white.ogg`, but that file is
 * the looping music track. This helper deliberately exposes only one-shot sound
 * effects so the Phaser remake can stay silent musically for now.
 */
export class GameAudio
{
    private static readonly SOUND_EFFECTS: readonly SoundEffectDefinition[] = [
        { key: "sfx-key", path: "assets/sounds/snd_key.ogg" },
        { key: "sfx-player-dying", path: "assets/sounds/snd_player_dying.ogg" },
        { key: "sfx-display-level", path: "assets/sounds/snd_display_level.ogg" },
        { key: "sfx-start-level", path: "assets/sounds/snd_start_level.ogg" }
    ];

    private static readonly KEY = "sfx-key";
    private static readonly PLAYER_DYING = "sfx-player-dying";
    private static readonly DISPLAY_LEVEL = "sfx-display-level";
    private static readonly START_LEVEL = "sfx-start-level";

    // The key pickup sound is noticeably sharper than the other effects.
    private static readonly KEY_VOLUME = 0.5;

    /**
     * Registers all gameplay sound effects with Phaser's loader.
     */
    static preload(scene: Scene): void
    {
        for (const soundEffect of GameAudio.SOUND_EFFECTS) {
            scene.load.audio(soundEffect.key, soundEffect.path);
        }
    }

    /**
     * Plays the short effect used when Sid collects a key tile.
     */
    static playKey(scene: Scene): void
    {
        GameAudio.play(scene, GameAudio.KEY, { volume: GameAudio.KEY_VOLUME });
    }

    /**
     * Plays the death effect at the same moment the visual death animation starts.
     */
    static playPlayerDying(scene: Scene): void
    {
        GameAudio.play(scene, GameAudio.PLAYER_DYING);
    }

    /**
     * Plays while the black reveal masks open at the beginning of a level run.
     */
    static playDisplayLevel(scene: Scene): void
    {
        GameAudio.stop(scene, GameAudio.DISPLAY_LEVEL);
        GameAudio.play(scene, GameAudio.DISPLAY_LEVEL);
    }

    /**
     * Plays just before the monster explosion reveal starts.
     */
    static playStartLevel(scene: Scene): void
    {
        GameAudio.stop(scene, GameAudio.START_LEVEL);
        GameAudio.play(scene, GameAudio.START_LEVEL);
    }

    /**
     * Stops any currently playing restored sound effect before a blocking state.
     */
    static stopGameplaySounds(scene: Scene): void
    {
        for (const soundEffect of GameAudio.SOUND_EFFECTS) {
            GameAudio.stop(scene, soundEffect.key);
        }
    }

    private static play(scene: Scene, key: string, options?: SoundEffectOptions): void
    {
        scene.sound.play(key, options);
    }

    private static stop(scene: Scene, key: string): void
    {
        scene.sound.stopByKey(key);
    }
}
