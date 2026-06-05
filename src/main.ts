import { AUTO, Game, Scale } from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";

/**
 * Browser entry point for the Phaser 4 prototype.
 *
 * This file replaces the old Phaser 2 bootstrap only on the prototype branch.
 * The game keeps the original 640x400 logical resolution, while Phaser's Scale
 * Manager enlarges the canvas in the browser so manual comparisons remain close
 * to the previous remake.
 */
const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;

/**
 * Minimal Phaser 4 game configuration.
 *
 * FIT preserves the game aspect ratio and scales the canvas to the largest size
 * that fits in the browser window. CENTER_BOTH then keeps the scaled canvas
 * centered inside the full-viewport parent element.
 */
const config = {
    type: AUTO,
    backgroundColor: "#c0c0c0",
    pixelArt: true,
    roundPixels: true,
    scale: {
        parent: "game-container",
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
    },
    scene: [
        PreloadScene,
        GameScene,
        HUDScene
    ]
};

window.addEventListener("load", () => {
    new Game(config);
});
