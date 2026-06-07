import type { GameScene } from "../scenes/GameScene";

/**
 * Installs browser-console helpers for development and regression testing.
 *
 * The helpers exist only when the game is launched with `?debug=1`. They stay
 * deliberately thin: GameScene still owns the gameplay state and performs the
 * actual actions.
 */
export class DebugConsole
{
    private readonly api: DebugApi;

    /**
     * @param scene Active gameplay scene that receives all debug commands.
     */
    constructor(private readonly scene: GameScene)
    {
        this.api = {
            help: () => this.help(),
            status: () => this.scene.getDebugStatus(),
            collectAllKeys: () => this.collectAllKeys(),
            finishLevel: () => this.finishLevel(),
            finishGame: () => this.finishGame(),
            resetLevel: () => this.resetLevel(),
            runtime: () => this.scene
        };
    }

    /**
     * Makes `sobDebug` available from the browser console.
     */
    install(): void
    {
        this.debugWindow().sobDebug = this.api;
        console.info("sobDebug installed. Try sobDebug.help();");
    }

    /**
     * Removes the helper if this scene instance still owns it.
     */
    destroy(): void
    {
        const debugWindow = this.debugWindow();

        if (debugWindow.sobDebug === this.api) {
            delete debugWindow.sobDebug;
        }
    }

    private help(): string[]
    {
        return [
            "sobDebug.collectAllKeys() - collect all keys for the current level",
            "sobDebug.finishLevel()     - collect all keys and start level/final completion",
            "sobDebug.finishGame()      - start the final end-game sequence immediately",
            "sobDebug.resetLevel()      - reset the current level runtime",
            "sobDebug.status()          - show the current runtime status",
            "sobDebug.runtime()         - return the active GameScene instance",
            "Numpad 8/2/4/6             - free-move Sid while ?debug=1 is enabled"
        ];
    }

    private collectAllKeys(): string
    {
        this.scene.collectAllKeysForDebug();
        return "All current-level keys collected. The exit is now open.";
    }

    private finishLevel(): string
    {
        this.scene.finishLevelForDebug();
        return "Current level completion requested.";
    }

    private finishGame(): string
    {
        this.scene.finishGameForDebug();
        return "Final end-game sequence requested.";
    }

    private resetLevel(): string
    {
        this.scene.resetLevelForDebug();
        return "Current level runtime reset.";
    }

    private debugWindow(): WindowWithDebugApi
    {
        return window as WindowWithDebugApi;
    }
}

export interface DebugStatus
{
    debugMode: boolean;
    level: number;
    keysCollected: number;
    keysNeeded: number;
    exitReady: boolean;
    exitReached: boolean;
    deaths: number;
    lives: number;
    score: number;
    hiScore: number;
    airLevel: number;
    monstersLoaded: number;
    levelRevealSequencePlaying: boolean;
    monsterSpawnSequencePlaying: boolean;
    levelTransitionSequencePlaying: boolean;
    endGameSequencePlaying: boolean;
    gameOverActive: boolean;
    endingScreenActive: boolean;
    deathSequencePlaying: boolean;
    player: {
        x: number;
        y: number;
    } | null;
}

interface DebugApi
{
    help(): string[];
    status(): DebugStatus;
    collectAllKeys(): string;
    finishLevel(): string;
    finishGame(): string;
    resetLevel(): string;
    runtime(): GameScene;
}

interface WindowWithDebugApi extends Window
{
    sobDebug?: DebugApi;
}
