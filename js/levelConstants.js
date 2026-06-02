/**
 * Centralized constants used by level.js.
 *
 * This file gives names to raw strings and magic numbers that were previously
 * scattered through the Level object. The goal is only to make the existing
 * implementation easier to read and safer to refactor later; the values are
 * intentionally preserved.
 */
var LevelConstants =
{
    // Generic level state values.
    INITIAL_LEVEL : 1,
    DEFAULT_AIR_LEVEL : 480,
    INITIAL_SEQUENCE_STEP : 1,
    INITIAL_LIVES : 3,

    // Steps used by the progressive level reveal sequence.
    DISPLAY_STEP_INITIALIZE : 1,
    DISPLAY_STEP_REVEAL : 2,

    // Steps used by the final end-game sequence.
    END_GAME_STEP_CONVERT_AIR : 1,
    END_GAME_STEP_SHOW_MESSAGE : 2,
    END_GAME_STEP_SCALE_MESSAGE : 3,
    END_GAME_STEP_WAIT_THEN_RESET : 4,

    // Tiled object custom property names and object layer names.
    TILED_PROPERTY_LEVEL : "level",
    OBJECT_LAYER_MONSTERS : "monsters",
    OBJECT_LAYER_END_LEVEL : "end level",

    // Tile indexes used by level.js.
    TILE_KEY_INDEX : 40,

    // Sprite and animation keys loaded in main.js.
    SPRITE_EXPLOSION : "explosion",
    SPRITE_END_LEVEL : "end level",
    SPRITE_TITLE : "title",
    SPRITE_GAME_OVER : "game over",
    FONT_BLAGGER : "blaggerFont",

    // Phaser/Tiled positioning offsets kept from the original implementation.
    END_LEVEL_Y_OFFSET : 16,

    // Level reveal animation configuration.
    DISPLAY_REVEAL_INITIAL_COUNTER : 1,
    DISPLAY_REVEAL_COUNTER_RESET : 2,
    DISPLAY_REVEAL_HEIGHT_STEP : 2,

    // Monster reveal animation configuration.
    EXPLOSION_FRAME_RATE : 18,

    // End-game score conversion and message animation values.
    END_GAME_AIR_DECREMENT : 6,
    END_GAME_SCORE_INCREMENT : 30,
    END_GAME_MESSAGE_WAIT_COUNTER : 220,
    END_GAME_INITIAL_SCALE : 0.1,
    END_GAME_SCALE_INCREMENT : 0.005,
    END_GAME_MAX_SCALE : 1.8,

    // Screen positions and colors used by the title, help and game-over screens.
    BLACK_COLOR : 0x000000,
    WHITE_COLOR : 0xFFFFFF,
    HELP_TEXT_COLOR : 0xc0c0c0,

    TITLE_X : 180,
    TITLE_Y : 50,
    INTRO_PROMPT_TEXT : "press any key to start or h for help",
    INTRO_PROMPT_X : 2,
    INTRO_PROMPT_Y : 11,

    HELP_TEXT_X : 10,
    HELP_TEXT_Y : 10,

    GAME_OVER_X : 140,
    GAME_OVER_Y : 50,

    END_GAME_MESSAGE_X : 60,
    END_GAME_MESSAGE_Y : 100
};
