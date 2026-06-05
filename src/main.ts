import { AUTO, Game } from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";

/**
 * Browser entry point for the Phaser 4 prototype.
 *
 * This file replaces the old Phaser 2 bootstrap only on the prototype branch.
 * It keeps the canvas at the same rough size as the current remake so screenshots
 * and manual comparisons remain easy while the port is still incomplete.
 */
const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;

/**
 * Minimal Phaser 4 game configuration.
 *
 * The scene list is still deliberately small: PreloadScene loads the current
 * assets, GameScene displays the map prototype, and HUDScene proves that a
 * parallel overlay scene can cover the old lower status area.
 */
const config = {
    type: AUTO,
    parent: "game-container",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // Keep the canvas background aligned with the original Phaser 2 stage color.
    // GameScene also sets its camera background explicitly for the scrolling viewport.
    backgroundColor: "#c0c0c0",
    pixelArt: true,
    roundPixels: true,
    scene: [
        PreloadScene,
        GameScene,
        HUDScene
    ]
};

window.addEventListener("load", () => {
    new Game(config);
});
