// Main Vite module entry point.
//
// Phaser 2.3 is still loaded as a classic script from public/js/phaser.min.js.
// The constant files, utility helpers, and some player support helpers are now
// real ES modules. They are still mirrored on window for temporary
// compatibility and console debugging.
//
// Most gameplay objects are still imported for their side effects: each module
// registers its legacy runtime object on window. They will be converted to
// explicit imports/exports in later steps.

import "./js/gameStates.js";
import "./js/playerStates.js";
import "./js/monsterConstants.js";
import "./js/levelConstants.js";
import "./js/hudConstants.js";

import "./js/levelRevealSequence.js";
import "./js/assetLoader.js";
import "./js/gameInitializer.js";
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
import "./js/gameController.js";

// Start the Phaser game only after all legacy-style modules above have
// registered their global objects.
import "./js/main.js";
