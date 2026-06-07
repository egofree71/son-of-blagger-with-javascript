/**
 * Gameplay values shared by the Phaser 4 session and level state.
 *
 * The numbers mirror the Phaser 2 implementation, but they now live outside the
 * HUD because the HUD should display state rather than decide gameplay rules.
 */
export const GameSessionConstants = {
    INITIAL_LEVEL: 1,
    INITIAL_LIVES: 3,
    DEFAULT_AIR_LEVEL: 480,
    AIR_DECREASE_DELAY: 36,
    AIR_REFERENCE_FPS: 60,
    AIR_DECREASE_AMOUNT: 1,
    KEY_SCORE_INCREMENT: 200
} as const;
