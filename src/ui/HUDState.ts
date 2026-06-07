/**
 * Runtime values displayed by HUDScene.
 *
 * The HUD receives this shape from GameSessionState and never reads gameplay
 * objects directly.
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
