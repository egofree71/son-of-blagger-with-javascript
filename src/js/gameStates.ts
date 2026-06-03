/**
 * Central list of all game states used by GameController.
 *
 * The string values are intentionally unchanged to preserve the current
 * behaviour. Only their usage is centralized through named constants.
 */
export const GameStates =
{
    LOAD_INTRODUCTION : "load introduction",
    INTRODUCTION : "introduction",

    LOAD_HELP : "load help",
    HELP : "help",

    LOAD_LEVEL : "load level",
    DISPLAY_LEVEL : "display level",
    START_LEVEL : "start level",
    DISPLAYING_MONSTERS : "displaying monsters",
    PLAYING : "playing",

    END_LEVEL : "end level",
    END_GAME : "end game",

    KILL_PLAYER : "killPlayer",
    SHOW_GAME_OVER : "show game over",
    GAME_OVER : "game over"
} as const;

export type GameState = typeof GameStates[keyof typeof GameStates];
