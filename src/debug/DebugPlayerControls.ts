import type { Tilemaps } from "phaser";
import type { Player } from "../entities/Player";

/**
 * Debug-only free movement helper.
 *
 * This class is enabled only through `?debug=1`. While a numpad movement key is
 * held, it moves the player directly through the Tiled world without applying
 * collisions, gravity, ladders, slides or jump rules. Releasing the key returns
 * control to the normal gameplay update.
 */
export class DebugPlayerControls
{
    private static readonly FREE_MOVE_SPEED_PIXELS_PER_SECOND = 480;
    private static readonly NUMPAD_UP = "Numpad8";
    private static readonly NUMPAD_DOWN = "Numpad2";
    private static readonly NUMPAD_LEFT = "Numpad4";
    private static readonly NUMPAD_RIGHT = "Numpad6";

    private readonly pressedCodes = new Set<string>();
    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.isDebugKey(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedCodes.add(event.code);
    };
    private readonly handleKeyUp = (event: KeyboardEvent): void => {
        if (!this.isDebugKey(event.code)) {
            return;
        }

        event.preventDefault();
        this.pressedCodes.delete(event.code);
    };

    constructor()
    {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    /**
     * Returns whether the current page URL enables debug-only helpers.
     */
    static isEnabled(): boolean
    {
        return new URLSearchParams(window.location.search).get("debug") === "1";
    }

    /**
     * Moves the player freely when a numpad debug key is held.
     *
     * The return value tells GameScene whether the normal gameplay update should
     * be skipped for this frame.
     */
    update(player: Player, map: Tilemaps.Tilemap, deltaMs: number): boolean
    {
        if (!this.isAnyDebugKeyDown()) {
            return false;
        }

        player.cancelMovementForDebug();

        const sprite = player.getSprite();
        const xDirection = this.directionValue(DebugPlayerControls.NUMPAD_RIGHT) -
            this.directionValue(DebugPlayerControls.NUMPAD_LEFT);
        const yDirection = this.directionValue(DebugPlayerControls.NUMPAD_DOWN) -
            this.directionValue(DebugPlayerControls.NUMPAD_UP);

        if (xDirection === 0 && yDirection === 0) {
            return true;
        }

        const distance = DebugPlayerControls.FREE_MOVE_SPEED_PIXELS_PER_SECOND * deltaMs / 1000;
        const diagonalScale = xDirection !== 0 && yDirection !== 0
            ? Math.SQRT1_2
            : 1;

        // Keep free-move inside the Tiled map bounds so Sid and the camera do
        // not drift into empty space while searching for test locations.
        const maxX = Math.max(0, map.widthInPixels - sprite.displayWidth);
        const maxY = Math.max(0, map.heightInPixels - sprite.displayHeight);
        const nextX = this.clamp(sprite.x + xDirection * distance * diagonalScale, 0, maxX);
        const nextY = this.clamp(sprite.y + yDirection * distance * diagonalScale, 0, maxY);

        sprite.setPosition(nextX, nextY);
        return true;
    }

    /**
     * Removes browser event listeners when the scene is destroyed or restarted.
     */
    destroy(): void
    {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
        this.pressedCodes.clear();
    }

    private isAnyDebugKeyDown(): boolean
    {
        return this.pressedCodes.has(DebugPlayerControls.NUMPAD_UP) ||
            this.pressedCodes.has(DebugPlayerControls.NUMPAD_DOWN) ||
            this.pressedCodes.has(DebugPlayerControls.NUMPAD_LEFT) ||
            this.pressedCodes.has(DebugPlayerControls.NUMPAD_RIGHT);
    }

    private directionValue(code: string): number
    {
        return this.pressedCodes.has(code)
            ? 1
            : 0;
    }

    private isDebugKey(code: string): boolean
    {
        return code === DebugPlayerControls.NUMPAD_UP ||
            code === DebugPlayerControls.NUMPAD_DOWN ||
            code === DebugPlayerControls.NUMPAD_LEFT ||
            code === DebugPlayerControls.NUMPAD_RIGHT;
    }

    private clamp(value: number, min: number, max: number): number
    {
        return Math.min(Math.max(value, min), max);
    }
}
