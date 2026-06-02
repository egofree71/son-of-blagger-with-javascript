/**
 * Centralized constants used by the Player object.
 *
 * The current player implementation still relies mostly on booleans such as
 * Player.jumping and Player.deadlyFall. This file does not introduce a full
 * player state machine yet. It only removes repeated raw strings from
 * player.js so future refactorings are safer.
 */
export const PlayerStates =
{
    // Horizontal and vertical movement directions used while computing one
    // gameplay frame. Values are preserved from the previous implementation.
    LEFT : "LEFT",
    RIGHT : "RIGHT",
    UP : "UP",
    DOWN : "DOWN",

    // Phaser sprite keys loaded in main.js and used by player.js.
    SPRITE_BLAGGER : "blagger",
    SPRITE_BLAGGER_WHITE : "blaggerWhite",
    SPRITE_BLAGGER_DYING : "blaggerDying",
    SPRITE_BLAGGER_DYING_WHITE : "blaggerDyingWhite",

    // Phaser animation names used by the normal player sprite.
    ANIMATION_LEFT : "left",
    ANIMATION_RIGHT : "right",

    // Phaser animation name used by the separate death sprite.
    ANIMATION_BLAGGER_DYING : "blaggerDying",

    // Death animation values preserved from the original implementation.
    DYING_SPRITE_Y_OFFSET : 1,
    DYING_ANIMATION_FRAME_RATE : 6
};

// Keep the constant object available globally while the rest of the legacy
// runtime is migrated progressively to explicit ES module imports.
window.PlayerStates = PlayerStates;
