/*
 * Centralized constants used by HUD.js.
 *
 * This file only gives names to existing HUD values. It should not change any
 * gameplay behavior, HUD timing, screen position, color, or formatting rule.
 */
export const HudConstants =
{
    // Basic HUD grid. The HUD uses the same 16x16 grid as the retro font.
    CHAR_WIDTH : 16,

    // General colors.
    COLOR_BLACK : 0x000000,
    COLOR_WHITE : 0xFFFFFF,
    COLOR_GREY : 0x808080,
    COLOR_AIR_BLUE : 0x399aff,

    // Phaser Graphics alpha used when drawing solid HUD rectangles.
    OPAQUE_ALPHA : 1,

    // Air bar background and inner black mask.
    AIR_BAR_LEFT_CHAR : 6,
    AIR_BAR_RIGHT_CHAR : 38,
    AIR_BAR_Y_CHAR : 2,
    AIR_BAR_INNER_X_OFFSET : 16,
    AIR_BAR_INNER_Y_OFFSET : 4,
    AIR_BAR_INNER_HEIGHT_REDUCTION : 8,
    AIR_GRADIENT_START_COLOR : "red",
    AIR_GRADIENT_END_COLOR : "#399aff",

    // Air depletion timing.
    AIR_DECREASE_DELAY : 36,
    AIR_DECREASE_AMOUNT : 1,

    // Bonus man display.
    BONUS_MAN_SPRITE_KEY : "bonusMan",
    BONUS_MAN_COLOR_DELAY : 3,
    BONUS_MAN_MIN_COLOR_INDEX : 0,
    BONUS_MAN_MAX_COLOR_INDEX : 3,

    // HUD labels.
    LABEL_AIR : "air",
    LABEL_LIVES : "lives",
    LABEL_SCORE : "score",
    LABEL_LEVEL : "level",
    LABEL_HI_SCORE : "hi-score",

    // HUD text and sprite positions, expressed in HUD character cells.
    AIR_LABEL_X : 2,
    AIR_LABEL_Y : 2,

    BONUS_MAN_X : 2,
    BONUS_MAN_Y : 5,

    LIVES_LABEL_X : 2,
    LIVES_LABEL_Y : 6,
    LIVES_VALUE_X : 8,
    LIVES_VALUE_Y : 6,

    SCORE_LABEL_X : 2,
    SCORE_LABEL_Y : 8,
    SCORE_VALUE_X : 8,
    SCORE_VALUE_Y : 8,

    LEVEL_LABEL_X : 30,
    LEVEL_LABEL_Y : 6,
    LEVEL_VALUE_X : 36,
    LEVEL_VALUE_Y : 6,

    HI_SCORE_LABEL_X : 23,
    HI_SCORE_LABEL_Y : 8,
    HI_SCORE_VALUE_X : 32,
    HI_SCORE_VALUE_Y : 8,

    // Numeric display formatting.
    TWO_DIGITS_PADDING : "00",
    TWO_DIGITS_LENGTH : -2,
    SIX_DIGITS_PADDING : "000000",
    SIX_DIGITS_LENGTH : -6,

    // Retro font configuration.
    FONT_KEY : "blaggerFont",
    FONT_CHAR_WIDTH : 16,
    FONT_CHAR_HEIGHT : 16
};

