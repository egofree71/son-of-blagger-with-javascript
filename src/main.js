// Main Vite module entry point.
//
// Phaser 2.3 is still loaded as a classic script from public/js/phaser.min.js.
// Most runtime objects are now real ES modules and are still mirrored on
// window for temporary compatibility and browser-console debugging. The
// remaining legacy entry point is src/js/main.js, which owns the Phaser.Game
// instance and delegates preload/create/update to the module-based objects.

import "./js/gameStates.js";
import "./js/playerStates.js";
import "./js/monsterConstants.js";
import "./js/levelConstants.js";
import "./js/hudConstants.js";

import "./js/levelRevealSequence.js";
import "./js/assetLoader.js";
import "./js/util.js";
import "./js/collisionDetector.js";
import "./js/screenManager.js";
import "./js/playerMovement.js";
import "./js/playerInteractions.js";
import "./js/playerDeathSequence.js";
import "./js/player.js";
import "./js/monster.js";
import "./js/data.js";
import "./js/levelObjectLoader.js";
import "./js/levelTransition.js";
import "./js/level.js";
import "./js/endGameSequence.js";
import "./js/HUD.js";

// Start the Phaser game only after all legacy-style modules above have
// registered their global objects.
import "./js/main.js";
