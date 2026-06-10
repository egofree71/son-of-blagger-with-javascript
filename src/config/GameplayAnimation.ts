/**
 * Actor animation cadence values for gameplay entities.
 *
 * These constants name rhythms that were previously hidden as local counters in
 * the entity classes. They are tied to accepted gameplay steps or to the fixed
 * gameplay clock, never to browser render frames.
 */
export const PLAYER_WALK_ACCEPTED_STEPS_PER_ANIMATION_FRAME = 5;
export const MONSTER_ANIMATION_CHECKS_PER_SECOND = 60;
