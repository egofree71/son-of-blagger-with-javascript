import type { GameRuntime } from "./gameRuntime.ts";

export interface SonOfBlaggerDebugStatus
{
    state: string | null;
    level: number;
    keysTaken: number;
    hasCollectedAllKeys: boolean;
    isLastLevel: boolean;
    airLevel: number;
    lives: number;
    score: number;
    hiScore: number;
    isPlaying: boolean;
}

export interface SonOfBlaggerDebugTools
{
    collectAllKeys(): string;
    finishLevel(): string;
    status(): SonOfBlaggerDebugStatus;
    runtime(): GameRuntime;
    help(): string[];
}

const DEBUG_QUERY_PARAMETER = "debug";
const DEBUG_ENABLED_VALUE = "1";

/**
 * Installs browser-console helpers when the game is explicitly launched with
 * ?debug=1. The helpers are intentionally small and runtime-focused: they are
 * meant to speed up manual testing without turning normal gameplay code into a
 * permanent cheat system.
 */
export function installDebugTools(runtime: GameRuntime): void
{
    if (!isDebugEnabled()) return;

    window.sobDebug = createDebugTools(runtime);

    console.info("Son of Blagger debug helpers enabled. Try sobDebug.help().");
}

function isDebugEnabled(): boolean
{
    return new URLSearchParams(window.location.search).get(DEBUG_QUERY_PARAMETER) == DEBUG_ENABLED_VALUE;
}

function createDebugTools(runtime: GameRuntime): SonOfBlaggerDebugTools
{
    return {
        collectAllKeys(): string
        {
            while (!runtime.level.hasCollectedAllKeys())
                runtime.level.collectKey();

            return "All keys collected for the current level. Touch the exit to test the normal transition.";
        },

        finishLevel(): string
        {
            this.collectAllKeys();

            if (runtime.level.isLastLevel())
            {
                runtime.gameController.endGame();
                return "All keys collected. End-game sequence started.";
            }

            runtime.gameController.endLevel();
            return "All keys collected. End-level transition started.";
        },

        status(): SonOfBlaggerDebugStatus
        {
            return {
                state: runtime.gameController.state,
                level: runtime.level.level,
                keysTaken: runtime.level.keysTaken,
                hasCollectedAllKeys: runtime.level.hasCollectedAllKeys(),
                isLastLevel: runtime.level.isLastLevel(),
                airLevel: runtime.level.airLevel,
                lives: runtime.gameController.lives,
                score: runtime.gameController.score,
                hiScore: runtime.gameController.hiScore,
                isPlaying: runtime.gameController.isPlaying()
            };
        },

        runtime(): GameRuntime
        {
            return runtime;
        },

        help(): string[]
        {
            return [
                "sobDebug.collectAllKeys() - collect all keys, then touch the exit normally.",
                "sobDebug.finishLevel() - collect all keys and start the end-level/end-game transition immediately.",
                "sobDebug.status() - show the current level, score, lives, air and state.",
                "sobDebug.runtime() - return the active GameRuntime instance for deeper manual inspection."
            ];
        }
    };
}
