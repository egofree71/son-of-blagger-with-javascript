import { GameObjects, Scene } from "phaser";

export const PROTOTYPE_KEYS_CHANGED_EVENT = "prototype-keys-changed";
export const PROTOTYPE_PLAYER_KILLED_EVENT = "prototype-player-killed";
export const PROTOTYPE_EXIT_CHANGED_EVENT = "prototype-exit-changed";

interface HUDSceneData
{
    debugModeEnabled?: boolean;
    keysCollected?: number;
    keysNeeded?: number;
    deaths?: number;
    exitReady?: boolean;
    exitReached?: boolean;
}

interface PrototypeKeysChangedEvent
{
    keysCollected: number;
    keysNeeded: number;
}

interface PrototypePlayerKilledEvent
{
    deaths: number;
}

interface PrototypeExitChangedEvent
{
    exitReady: boolean;
    exitReached: boolean;
}

/**
 * Temporary HUD overlay for the Phaser 4 prototype.
 *
 * The values are still placeholders. The purpose of this scene is to reserve the
 * same lower status area as the Phaser 2 version while GameScene displays and
 * scrolls the map above it. The real bitmap-style HUD should be ported later.
 */
export class HUDScene extends Scene
{
    private keysText?: GameObjects.Text;
    private deathsText?: GameObjects.Text;
    private exitText?: GameObjects.Text;

    constructor()
    {
        super("HUDScene");
    }

    create(data: HUDSceneData = {}): void
    {
        this.add.rectangle(320, 384, 640, 32, 0x000000)
            .setOrigin(0.5);

        this.add.text(16, 374, "PLAYER JUMP", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(155, 374, "SPACE JUMP", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.keysText = this.add.text(285, 374, "", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.deathsText = this.add.text(390, 374, "", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.exitText = this.add.text(500, 374, "", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(590, 374, "L1", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.updateKeysText({
            keysCollected: data.keysCollected ?? 0,
            keysNeeded: data.keysNeeded ?? 0
        });
        this.updateDeathsText({ deaths: data.deaths ?? 0 });
        this.updateExitText({
            exitReady: data.exitReady ?? false,
            exitReached: data.exitReached ?? false
        });

        this.game.events.on(PROTOTYPE_KEYS_CHANGED_EVENT, this.updateKeysText, this);
        this.game.events.on(PROTOTYPE_PLAYER_KILLED_EVENT, this.updateDeathsText, this);
        this.game.events.on(PROTOTYPE_EXIT_CHANGED_EVENT, this.updateExitText, this);

        // Game-wide events survive scene restarts, so the temporary HUD removes
        // its listeners when the scene is stopped or destroyed.
        this.events.once("shutdown", () => this.removeGameEventListeners());
        this.events.once("destroy", () => this.removeGameEventListeners());

        if (!data.debugModeEnabled) {
            return;
        }

        // Keep the hint short: the fake HUD is temporary and should not crowd
        // the gameplay viewport while testing movement details.
        this.add.text(500, 390, "DBG 8/2/4/6", {
            fontFamily: "Arial",
            fontSize: "10px",
            color: "#aaaaaa"
        });
    }

    private updateKeysText(data: PrototypeKeysChangedEvent): void
    {
        this.keysText?.setText(`KEYS ${data.keysCollected}/${data.keysNeeded}`);
    }

    private updateDeathsText(data: PrototypePlayerKilledEvent): void
    {
        this.deathsText?.setText(`D ${data.deaths}`);
    }

    private updateExitText(data: PrototypeExitChangedEvent): void
    {
        if (data.exitReached) {
            this.exitText?.setText("EXIT DONE");
            return;
        }

        this.exitText?.setText(data.exitReady ? "EXIT OPEN" : "EXIT --");
    }

    private removeGameEventListeners(): void
    {
        this.game.events.off(PROTOTYPE_KEYS_CHANGED_EVENT, this.updateKeysText, this);
        this.game.events.off(PROTOTYPE_PLAYER_KILLED_EVENT, this.updateDeathsText, this);
        this.game.events.off(PROTOTYPE_EXIT_CHANGED_EVENT, this.updateExitText, this);
    }
}
