import type { GameScene } from "../scenes/GameScene";

/**
 * Installs browser-console helpers for the Phaser 4 prototype.
 *
 * These helpers exist only when the game is launched with `?debug=1`. They are
 * intentionally small and delegate real work back to GameScene so the prototype
 * gameplay state still has one owner.
 */
export class DebugConsole
{
    private readonly api: PrototypeDebugApi;

    constructor(private readonly scene: GameScene)
    {
        this.api = {
            help: () => this.help(),
            status: () => this.scene.getPrototypeDebugStatus(),
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
            "sobDebug.resetLevel()      - reset the player, keys and temporary exit state",
            "sobDebug.status()          - show the current Phaser 4 prototype status",
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
        return "Prototype level state reset.";
    }

    private debugWindow(): WindowWithDebugApi
    {
        return window as WindowWithDebugApi;
    }
}

export interface PrototypeDebugStatus
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

interface PrototypeDebugApi
{
    help(): string[];
    status(): PrototypeDebugStatus;
    collectAllKeys(): string;
    finishLevel(): string;
    finishGame(): string;
    resetLevel(): string;
    runtime(): GameScene;
}

interface WindowWithDebugApi extends Window
{
    sobDebug?: PrototypeDebugApi;
}
