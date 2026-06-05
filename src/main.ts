// Main Vite module entry point.
//
// Phaser 2.3 is still loaded as a classic browser script from public/js/phaser.min.js.
// The game runtime itself is now loaded through ES module imports starting from
// src/js/phaserGame.ts. That file creates the Phaser.Game instance and
// routes the Phaser lifecycle callbacks to the active Runtime instance.

import "./js/phaserGame.ts";
