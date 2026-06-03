/**
 * Centralized constants used by the Monster constructor.
 *
 * Monsters are mostly driven by data coming from the Tiled map: initial
 * direction, level number and maximum travel distance. This file keeps the
 * raw strings used by monster.js in one place, without changing the existing
 * movement rules.
 */
export const MonsterConstants =
{
    // Directions stored in the Tiled object properties and used while moving
    // monsters along their predefined path.
    DIRECTION_RIGHT : "right",
    DIRECTION_LEFT : "left",
    DIRECTION_DOWN : "down",
    DIRECTION_UP : "up",

    // Tiled object custom property names used when creating a monster.
    PROPERTY_DIRECTION : "direction",
    PROPERTY_LEVEL : "level",
    PROPERTY_MAX_DISTANCE : "maxDistance",

    // Phaser animation configuration used by all current monster sprites.
    ANIMATION_DEFAULT : "animation",
    ANIMATION_FRAMES : [0, 1],
    ANIMATION_FRAME_RATE : 10,

    // Default movement speed, preserved from the previous implementation.
    DEFAULT_SPEED : 0.5,

    // Phaser uses the top-left corner of a sprite, while Tiled objects in this
    // map are positioned differently on the vertical axis. The existing code
    // compensated with a hard-coded -42 offset; the value is now named but
    // intentionally unchanged.
    TILED_TO_PHASER_Y_OFFSET : 42
};

