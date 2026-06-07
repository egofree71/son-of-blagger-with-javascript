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
            "sobDebug.collectAllKeys() - collect all level-1 keys and open the temporary exit",
            "sobDebug.finishLevel()     - collect all keys and mark the temporary exit as reached",
            "sobDebug.resetLevel()      - reset the player, keys and temporary exit state",
            "sobDebug.status()          - show the current Phaser 4 prototype status",
            "sobDebug.runtime()         - return the active GameScene instance",
            "Numpad 8/2/4/6             - free-move Sid while ?debug=1 is enabled"
        ];
    }

    private collectAllKeys(): string
    {
        this.scene.collectAllKeysForDebug();
        return "All level-1 keys collected. The temporary exit is now open.";
    }

    private finishLevel(): string
    {
        this.scene.finishLevelForDebug();
        return "Temporary exit marked as reached. Full level transitions are not ported yet.";
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
    monstersLoaded: number;
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
    resetLevel(): string;
    runtime(): GameScene;
}

interface WindowWithDebugApi extends Window
{
    sobDebug?: PrototypeDebugApi;
}
