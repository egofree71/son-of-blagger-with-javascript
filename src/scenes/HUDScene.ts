import { GameObjects, Scene } from "phaser";

export const PROTOTYPE_KEYS_CHANGED_EVENT = "prototype-keys-changed";

interface HUDSceneData
{
    debugModeEnabled?: boolean;
    keysCollected?: number;
    keysNeeded?: number;
}

interface PrototypeKeysChangedEvent
{
    keysCollected: number;
    keysNeeded: number;
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

        this.add.text(220, 374, "SPACE JUMP", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.keysText = this.add.text(360, 374, "", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.add.text(500, 374, "LEVEL 1", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff"
        });

        this.updateKeysText({
            keysCollected: data.keysCollected ?? 0,
            keysNeeded: data.keysNeeded ?? 0
        });

        this.game.events.on(PROTOTYPE_KEYS_CHANGED_EVENT, this.updateKeysText, this);

        // Game-wide events survive scene restarts, so the temporary HUD removes
        // its listener when the scene is stopped or destroyed.
        this.events.once("shutdown", () => this.game.events.off(PROTOTYPE_KEYS_CHANGED_EVENT, this.updateKeysText, this));
        this.events.once("destroy", () => this.game.events.off(PROTOTYPE_KEYS_CHANGED_EVENT, this.updateKeysText, this));

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
}
