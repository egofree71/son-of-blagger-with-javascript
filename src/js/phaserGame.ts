"use strict";

import { Runtime } from "./gameRuntime.ts";

// This module is the Vite-loaded launcher for the Phaser 2 game.
// The active runtime owns the Phaser.Game creation and callback wiring.
Runtime.start();
