/**
 * Runtime values displayed by HUDScene.
 *
 * This is deliberately small for now: it gives the Phaser 4 prototype a real HUD
 * contract without pulling the whole Phaser 2 GameController across too early.
 */
export interface HUDState
{
    lives: number;
    score: number;
    hiScore: number;
    levelNumber: number;
    airLevel: number;
    hasBonusMan: boolean;
}

export type HUDStatePatch = Partial<HUDState>;

export const DEFAULT_HUD_STATE: HUDState = {
    lives: 3,
    score: 0,
    hiScore: 0,
    levelNumber: 1,
    airLevel: 480,
    hasBonusMan: false
};
