// Main Vite module entry point.
//
// Phaser 2.3 is still loaded as a classic browser script from public/js/phaser.min.js.
// The game runtime itself is now loaded through ES module imports starting from
// src/js/main.js. That file creates the Phaser.Game instance and imports the
// modules required by the Phaser lifecycle.

import "./js/main.js";
