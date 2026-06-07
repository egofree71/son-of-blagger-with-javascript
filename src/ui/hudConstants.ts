/**
 * Coordinates and timings for the Phaser 4 HUD port.
 *
 * The values intentionally mirror the old Phaser 2 HUD constants. Positions are
 * expressed on the same 16x16 character grid, with the HUD occupying the lower
 * half of the original 640x400 canvas.
 */
export const HudConstants = {
    HUD_TOP: 200,
    HUD_WIDTH: 640,
    HUD_HEIGHT: 200,

    CHAR_WIDTH: 16,
    FONT_CHAR_WIDTH: 16,
    FONT_CHAR_HEIGHT: 16,
    REFERENCE_FPS: 60,
    LOGICAL_FRAME_MS: 1000 / 60,

    COLOR_BLACK: 0x000000,
    COLOR_WHITE: 0xffffff,
    COLOR_GREY: 0x808080,
    COLOR_AIR_BLUE: 0x399aff,

    AIR_BAR_LEFT_CHAR: 6,
    AIR_BAR_RIGHT_CHAR: 38,
    AIR_BAR_Y_CHAR: 2,
    AIR_BAR_INNER_X_OFFSET: 16,
    AIR_BAR_INNER_Y_OFFSET: 4,
    AIR_BAR_INNER_HEIGHT_REDUCTION: 8,
    AIR_GRADIENT_START_COLOR: "red",
    AIR_GRADIENT_END_COLOR: "#399aff",

    BONUS_MAN_COLOR_DELAY: 3,
    BONUS_MAN_MIN_COLOR_INDEX: 0,
    BONUS_MAN_MAX_COLOR_INDEX: 3,

    LABEL_AIR: "air",
    LABEL_LIVES: "lives",
    LABEL_SCORE: "score",
    LABEL_LEVEL: "level",
    LABEL_HI_SCORE: "hi-score",

    AIR_LABEL_X: 2,
    AIR_LABEL_Y: 2,

    BONUS_MAN_X: 2,
    BONUS_MAN_Y: 5,

    LIVES_LABEL_X: 2,
    LIVES_LABEL_Y: 6,
    LIVES_VALUE_X: 8,
    LIVES_VALUE_Y: 6,

    SCORE_LABEL_X: 2,
    SCORE_LABEL_Y: 8,
    SCORE_VALUE_X: 8,
    SCORE_VALUE_Y: 8,

    LEVEL_LABEL_X: 30,
    LEVEL_LABEL_Y: 6,
    LEVEL_VALUE_X: 36,
    LEVEL_VALUE_Y: 6,

    HI_SCORE_LABEL_X: 23,
    HI_SCORE_LABEL_Y: 8,
    HI_SCORE_VALUE_X: 32,
    HI_SCORE_VALUE_Y: 8,

    TWO_DIGITS_PADDING: "00",
    SIX_DIGITS_PADDING: "000000"
} as const;
