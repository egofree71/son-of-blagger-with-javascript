/**
 * Timing values for short blocking visual effects used by gameplay sequences.
 *
 * These animations are driven by elapsed milliseconds, not by browser render
 * frames. The constants live together so the regular monster spawn explosion
 * and the reverse explosion used during level transitions stay synchronized.
 */
export const EXPLOSION_EFFECT_FRAME_COUNT = 15;
export const EXPLOSION_EFFECT_FRAMES_PER_SECOND = 18;
export const EXPLOSION_EFFECT_FRAME_DURATION_MS = 1000 / EXPLOSION_EFFECT_FRAMES_PER_SECOND;

export const PLAYER_DEATH_ANIMATION_FRAME_COUNT = 8;
export const PLAYER_DEATH_ANIMATION_FRAMES_PER_SECOND = 6;
export const PLAYER_DEATH_ANIMATION_FRAME_DURATION_MS = 1000 / PLAYER_DEATH_ANIMATION_FRAMES_PER_SECOND;
