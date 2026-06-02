"use strict";

import { AssetLoader } from "./assetLoader.js";
import { GameInitializer } from "./gameInitializer.js";
import { GameController } from "./gameController.js";

// These Phaser runtime objects are still shared through the browser global scope.
// The game now runs from a Vite module entry point, so they are attached
// explicitly to window instead of relying on classic script globals.
window.map = null;
window.keyPressed = null;
window.layer = null;
window.vanishingPlatformGroup = null;

window.game = new Phaser.Game(640, 400, Phaser.AUTO, '', { preload: preload, create: create, update: updateGame });

// Load all Phaser assets before create() runs.
function preload()
{
	AssetLoader.preload();
}

function create()
{
	GameInitializer.create();
}

function updateGame()
{
	GameController.update();
}
