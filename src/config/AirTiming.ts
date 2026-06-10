/**
 * Air depletion timing used during normal gameplay.
 *
 * The old game logic counted 36 steps on a 60 reference steps-per-second clock,
 * which means one air unit is consumed every 600 ms. The Phaser 4 runtime keeps
 * that rhythm with elapsed milliseconds so the air bar drains independently
 * from browser refresh rate and from the fixed gameplay tick simulation.
 */
export const AIR_DEPLETION_REFERENCE_STEPS_PER_SECOND = 60;
export const AIR_DEPLETION_INTERVAL_STEPS = 36;
export const AIR_DEPLETION_INTERVAL_MS = AIR_DEPLETION_INTERVAL_STEPS * 1000 / AIR_DEPLETION_REFERENCE_STEPS_PER_SECOND;
export const AIR_DEPLETION_AMOUNT = 1;
