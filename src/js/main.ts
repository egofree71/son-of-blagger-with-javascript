"use strict";

import { Runtime } from "./gameRuntime.ts";

// These Phaser runtime objects are still shared through the browser global scope.
// The game now runs from a Vite module entry point, so they are attached
// explicitly to window instead of relying on classic script globals.
window.map = null;
window.keyPressed = null;
window.layer = null;
window.vanishingPlatformGroup = null;

window.game = new Phaser.Game(640, 400, Phaser.AUTO, '', { preload: preload, create: create, update: updateGame });

// Phaser lifecycle callbacks are routed through the active runtime instance.
function preload()
{
	Runtime.preload();
}

function create()
{
	Runtime.create();
}

function updateGame()
{
	Runtime.update();
}
