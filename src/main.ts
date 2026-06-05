import { AUTO, Game } from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";

const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;

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

window.addEventListener("load", () => {
    new Game(config);
});
