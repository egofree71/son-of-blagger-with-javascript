/**
 * Gameplay values shared by the session and level state.
 *
 * These constants live outside the HUD because the HUD should display state
 * rather than decide gameplay rules.
 */
export const GameSessionConstants = {
    INITIAL_LEVEL: 1,
    LEVEL_COUNT: 12,
    INITIAL_LIVES: 3,
    DEFAULT_AIR_LEVEL: 480,
    KEY_SCORE_INCREMENT: 200,
    END_LEVEL_AIR_STEP: 6,
    END_LEVEL_SCORE_STEP: 30,
    END_GAME_AIR_STEP: 6,
    END_GAME_SCORE_STEP: 30
} as const;
