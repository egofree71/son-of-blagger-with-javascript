/**
 * Timing values for blocking flow sequences.
 *
 * These sequences are not part of the fixed gameplay tick simulation. They keep
 * the old 60 reference steps-per-second timing, but advance from elapsed
 * milliseconds so level
 * reveals, level transitions and the ending screen stay stable on every display.
 */
export const SEQUENCE_REFERENCE_STEPS_PER_SECOND = 60;
export const SEQUENCE_REFERENCE_STEP_MS = 1000 / SEQUENCE_REFERENCE_STEPS_PER_SECOND;

export const LEVEL_REVEAL_STEP_INTERVAL_STEPS = 2;
export const LEVEL_REVEAL_STEP_INTERVAL_MS = LEVEL_REVEAL_STEP_INTERVAL_STEPS * SEQUENCE_REFERENCE_STEP_MS;
export const LEVEL_REVEAL_HEIGHT_STEP_PX = 2;

export const LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS = 4;
export const LEVEL_TRANSITION_PLAYER_TILE_STEP_PX = 16;

export const ENDING_MESSAGE_INITIAL_SCALE = 0.1;
export const ENDING_MESSAGE_SCALE_INCREMENT_PER_STEP = 0.005;
export const ENDING_MESSAGE_MAX_SCALE = 1.8;
export const ENDING_WAIT_STEPS = 220;
