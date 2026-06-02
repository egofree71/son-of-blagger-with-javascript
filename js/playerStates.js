/**
 * Centralized constants used by the Player object.
 *
 * The current player implementation still relies mostly on booleans such as
 * Player.jumping and Player.deadlyFall. This file does not introduce a full
 * player state machine yet. It only removes repeated raw strings from
 * player.js so future refactorings are safer.
 */
var PlayerStates =
{
    // Horizontal and vertical movement directions used while computing one
    // gameplay frame. Values are preserved from the previous implementation.
    LEFT : "LEFT",
    RIGHT : "RIGHT",
    UP : "UP",
    DOWN : "DOWN",

    // Phaser animation names used by the normal player sprite.
    ANIMATION_LEFT : "left",
    ANIMATION_RIGHT : "right",
    ANIMATION_DYING : "dying",

    // Phaser animation name used by the separate death sprite.
    ANIMATION_BLAGGER_DYING : "blaggerDying"
};
