/**
 * Shared timing values for gameplay simulation.
 *
 * Phaser renders whenever the browser provides a frame. Gameplay systems that
 * still rely on small pixel/tile steps are instead driven by a fixed tick clock
 * so their speed stays stable across displays and mobile browsers.
 */
export const GAMEPLAY_TICKS_PER_SECOND = 60;
export const GAMEPLAY_TICK_SECONDS = 1 / GAMEPLAY_TICKS_PER_SECOND;
export const GAMEPLAY_TICK_MS = GAMEPLAY_TICK_SECONDS * 1000;

// Clamp browser stalls so a long pause cannot create a huge gameplay backlog.
export const MAX_GAMEPLAY_ACCUMULATED_MS = 100;
export const MAX_GAMEPLAY_TICKS_PER_RENDER = 4;

/**
 * Converts a design speed expressed in pixels per second into the fractional
 * pixel amount that should be accumulated on each fixed gameplay tick.
 */
export function pixelsPerGameplayTick(pixelsPerSecond: number): number
{
    return pixelsPerSecond * GAMEPLAY_TICK_SECONDS;
}

/**
 * Converts a rate expressed as occurrences per second into the fractional
 * amount that should be accumulated on each fixed gameplay tick.
 */
export function eventsPerGameplayTick(eventsPerSecond: number): number
{
    return eventsPerSecond * GAMEPLAY_TICK_SECONDS;
}
