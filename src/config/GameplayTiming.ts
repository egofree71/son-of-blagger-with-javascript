/**
 * Shared timing values for gameplay simulation.
 *
 * Phaser renders whenever the browser provides a frame, which may be 60 Hz,
 * 120 Hz or another display refresh rate. Gameplay systems that still rely on
 * small pixel/tile steps are instead driven by this fixed logical clock so that
 * their speed stays stable across displays and mobile browsers.
 */
export const GAMEPLAY_LOGICAL_FPS = 120;
export const GAMEPLAY_LOGICAL_STEP_SECONDS = 1 / GAMEPLAY_LOGICAL_FPS;
export const GAMEPLAY_LOGICAL_STEP_MS = GAMEPLAY_LOGICAL_STEP_SECONDS * 1000;

// Clamp browser stalls so a long pause cannot create a huge gameplay backlog.
export const MAX_GAMEPLAY_ACCUMULATED_MS = 100;
export const MAX_GAMEPLAY_STEPS_PER_RENDER = 4;

/**
 * Converts a design speed expressed in pixels per second into the fractional
 * pixel amount that should be accumulated on each fixed gameplay tick.
 */
export function pixelsPerGameplayTick(pixelsPerSecond: number): number
{
    return pixelsPerSecond * GAMEPLAY_LOGICAL_STEP_SECONDS;
}

/**
 * Converts a rate expressed as occurrences per second into the fractional
 * amount that should be accumulated on each fixed gameplay tick.
 */
export function eventsPerGameplayTick(eventsPerSecond: number): number
{
    return eventsPerSecond * GAMEPLAY_LOGICAL_STEP_SECONDS;
}
