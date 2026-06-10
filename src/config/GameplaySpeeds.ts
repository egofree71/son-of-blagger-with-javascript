/**
 * Gameplay movement speeds expressed in design units.
 *
 * These values describe how fast entities should move in the game world, not
 * how often the browser renders. Runtime code converts them through the fixed
 * gameplay tick clock so Sid and the monsters keep the same speed on displays
 * with different refresh rates.
 */
export const PLAYER_PIXEL_STEP_SPEED_PX_PER_SECOND = 60;
export const MONSTER_PATH_SPEED_PX_PER_SECOND = 30;

// Monsters intentionally move in visible half-pixel chunks to preserve the
// current path timing and collision feel while still using a px/s speed source.
export const MONSTER_PATH_STEP_DISTANCE_PX = 0.5;
