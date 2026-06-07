import { AUTO, Game, Scale } from "phaser";
import { PreloadScene } from "./scenes/PreloadScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";
import { TitleScene } from "./scenes/TitleScene";
import { HelpScene } from "./scenes/HelpScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { EndingScene } from "./scenes/EndingScene";

/**
 * Browser entry point for the Phaser 4 game.
 *
 * The game keeps a 640x400 logical resolution. Phaser's Scale Manager enlarges
 * the canvas in the browser while preserving the aspect ratio.
 */

const GAME_WIDTH = 640;
const GAME_HEIGHT = 400;

const config = {
    type: AUTO,
    backgroundColor: "#c0c0c0",

    // Let the browser smooth the final scaled canvas. Forcing pixel-art scaling
    // makes diagonal tiles shimmer at fractional browser sizes.
    pixelArt: false,
    roundPixels: true,

    // FIT preserves the aspect ratio and fills the available browser area.
    scale: {
        parent: "game-container",
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT
    },

    scene: [
        PreloadScene,
        TitleScene,
        HelpScene,
        GameScene,
        HUDScene,
        GameOverScene,
        EndingScene
    ]
};

window.addEventListener("load", () => {
    new Game(config);
});
