/**
 * Central list of all game states used by GameController.
 *
 * Before this refactoring step, the same state names were written directly as
 * strings in several files, for example "playing", "end level" or
 * "load introduction". That is fragile: a typo in one file can silently break
 * the game flow.
 *
 * The string values are intentionally unchanged to preserve the current
 * behaviour. Only their usage is now centralized through named constants.
 */
var GameStates =
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
};
