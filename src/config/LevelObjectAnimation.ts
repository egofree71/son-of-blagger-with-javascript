/**
 * Animation timing for level objects drawn above the static Tiled map.
 *
 * These values describe elapsed-time visual loops, not gameplay-tick movement.
 * Vanishing platform values live here too because their visible animation frame
 * also decides when the platform temporarily stops colliding with Sid.
 */
export const LEVEL_OBJECT_ANIMATION_FRAME_COUNT = 8;
export const LEVEL_OBJECT_ANIMATION_FRAMES_PER_SECOND = 30;
export const LEVEL_OBJECT_ANIMATION_FRAME_DURATION_MS = 1000 / LEVEL_OBJECT_ANIMATION_FRAMES_PER_SECOND;

export const VANISHING_PLATFORM_FRAME_COUNT = 8;
export const VANISHING_PLATFORM_NON_COLLIDING_FRAME = 4;
export const VANISHING_PLATFORM_FRAMES_PER_SECOND = 2;
export const VANISHING_PLATFORM_FRAME_DURATION_MS = 1000 / VANISHING_PLATFORM_FRAMES_PER_SECOND;
