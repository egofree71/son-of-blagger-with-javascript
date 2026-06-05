import { AUTO, Game } from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";

// Keep the prototype canvas close to the current remake resolution.
// This makes visual comparison with the Phaser 2 reference easier while the port is still incomplete.
const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;

// Phaser 4 is now loaded as an npm module instead of relying on public/js/phaser.min.js.
// The scene list is deliberately small for the first prototype: load assets, show gameplay area,
// then run a HUD overlay in parallel.
const config = {
    type: AUTO,
    parent: "game-container",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#000000",
    pixelArt: true,
    roundPixels: true,
    scene: [
        PreloadScene,
        GameScene,
        HUDScene
    ]
};

// Starting the game after the page load keeps the bootstrap simple and avoids depending on
// DOM elements before the #game-container node exists.
window.addEventListener("load", () => {
    new Game(config);
});
