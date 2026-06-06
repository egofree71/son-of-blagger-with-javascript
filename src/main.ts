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

const config = {
    type: AUTO,
    backgroundColor: "#c0c0c0",

    // Let the browser smooth the final scaled canvas, like the Phaser 2 reference.
    // Forcing pixel-art scaling makes diagonal tiles shimmer at fractional sizes.
    pixelArt: false,
    roundPixels: true,

    // FIT preserves the aspect ratio and fills the browser height as much as the
    // original Phaser 2 SHOW_ALL-style display did.
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
