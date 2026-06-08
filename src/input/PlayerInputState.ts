import type { Types } from "phaser";

/**
 * Small input shape consumed by Player.
 *
 * Keyboard keys and virtual touch buttons both feed this neutral state, so the
 * movement code does not need to know where the command came from.
 */
export interface PlayerInputState
{
    left: boolean;
    right: boolean;
    jump: boolean;
}

export type PlayerInputControl = keyof PlayerInputState;

export interface PlayerInputControlChangedPayload
{
    control: PlayerInputControl;
    active: boolean;
}

export const TOUCH_CONTROL_CHANGED_EVENT = "touch-control-changed";
export const TOUCH_HELP_REQUESTED_EVENT = "touch-help-requested";

/**
 * Creates a mutable empty input state.
 */
export function createEmptyPlayerInputState(): PlayerInputState
{
    return {
        left: false,
        right: false,
        jump: false
    };
}

/**
 * Converts Phaser's keyboard cursor object to the same state used by touch.
 */
export function readKeyboardPlayerInput(cursors?: Types.Input.Keyboard.CursorKeys): PlayerInputState
{
    return {
        left: cursors?.left?.isDown === true,
        right: cursors?.right?.isDown === true,
        jump: cursors?.space?.isDown === true
    };
}

/**
 * Merges two input sources. Holding either source keeps the command active.
 */
export function mergePlayerInputStates(first: PlayerInputState, second: PlayerInputState): PlayerInputState
{
    return {
        left: first.left || second.left,
        right: first.right || second.right,
        jump: first.jump || second.jump
    };
}
