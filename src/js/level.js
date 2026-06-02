import { GameStates } from "./gameStates.js";
import { LevelConstants } from "./levelConstants.js";
import { LevelRevealSequence } from "./levelRevealSequence.js";
import { EndGameSequence } from "./endGameSequence.js";
import { Data } from "./data.js";
import { LevelObjectLoader } from "./levelObjectLoader.js";
import { LevelTransition } from "./levelTransition.js";
import { Player } from "./player.js";
import { HUD } from "./HUD.js";
import { GameController } from "./gameController.js";

export const Level =
{
  // Current level
  level : LevelConstants.INITIAL_LEVEL,

  // air level of the current level
  airLevel : LevelConstants.DEFAULT_AIR_LEVEL,

  // Array which contains all monsters for a given level
  monsters : [],
  // Group which contains the monsters (used for display order)
  monstersGroup : null,

  animationCounterMax : 0,
  animationCounter : 0,

  // Group which contains 'explosion' objects displayed when showing monsters
  explosions : null,
  // Group which contains ' reverse explosion' objects displayed when hiding monsters of the previous level
  reverseExplosions : null,
  // The end level object stores the position of the end's level
  endLevel : null,

  // Number of keys taken in the current level
  keysTaken : 0,
  bonusMan : false,

  resetAirLevel : function()
  {
      this.airLevel = LevelConstants.DEFAULT_AIR_LEVEL;
  },

  initMonsters : function()
  {
      this.explosions = game.add.group();
      this.explosions.enableBody = true;

      this.reverseExplosions = game.add.group();
      this.reverseExplosions.enableBody = true;

  },

  // Add the monsters for the current level.
  // Tiled parsing and sprite creation are delegated to LevelObjectLoader.
  addMonsters : function()
  {
      this.monsters = LevelObjectLoader.loadMonsters(this.level, this.monsters, this.monstersGroup);

      // Get the animation counter maximum used to set the animation's speed.
      this.animationCounterMax = Data.levels[this.level-1][1];
      this.animationCounter = this.animationCounterMax;
  },

  // Update monsters position
  updateMonsters : function()
  {
      for (var i = 0; i < this.monsters.length; i++)
          this.monsters[i].updatePosition();
  },

  // Before displaying monsters, show 'explosions'
  displayMonsters : function()
  {
    this.explosions.removeAll(true);

    // Defensive fallback: all current levels have monsters, but if a future
    // level has none, do not leave the game stuck in DISPLAYING_MONSTERS.
    if (this.monsters.length == 0)
    {
        GameController.gameState = GameStates.PLAYING;
        return;
    }

    // Display an explosion for each monster
    for (var i = 0; i < this.monsters.length; i++)
    {
  		var explosion = this.explosions.create(this.monsters[i].firstPositionX, this.monsters[i].firstPositionY, LevelConstants.SPRITE_EXPLOSION);
  		var anim = explosion.animations.add(LevelConstants.SPRITE_EXPLOSION);

  		anim.onComplete.add(function()
  		{
  			// Show the monsters and start playing.
            for (var i = 0; i < Level.monsters.length; i++)
                Level.monsters[i].sprite.visible = true;

  			GameController.gameState = GameStates.PLAYING;
  		});

  		explosion.animations.play(LevelConstants.SPRITE_EXPLOSION, LevelConstants.EXPLOSION_FRAME_RATE, false, true);
  	}

  	GameController.gameState = GameStates.DISPLAYING_MONSTERS;
  },


  // Reset the game properties
  resetGame : function()
  {
      // If there is a new hi-score, store it in the local storage
      if (GameController.score > GameController.hiScore)
      {
            localStorage.setItem('hiScore', GameController.score);
  	       GameController.hiScore = GameController.score;
      }

    this.level = LevelConstants.INITIAL_LEVEL;
  	GameController.score = 0;
  	GameController.lives = LevelConstants.INITIAL_LIVES;

    LevelTransition.reset();
    EndGameSequence.reset();
    HUD.update();
  },

  // Move the player to the next level and increase score according to the air's level
  goToNext : function()
  {
      LevelTransition.update();
  },

  // Reset runtime data that belongs to the current level attempt.
  resetLevelState : function()
  {
      this.airLevel = LevelConstants.DEFAULT_AIR_LEVEL;
      this.keysTaken = 0;
      this.bonusMan = false;
  },

  // Load the objects needed for a given level.
  load : function()
  {
      this.resetLevelState();

      Player.reset();
      this.addMonsters();
      this.endLevel = LevelObjectLoader.loadEndLevel(this.level, this.endLevel);
  },

  // Display progressively the map with two disappearing black rectangles.
  // The actual frame-by-frame sequence is handled by LevelRevealSequence.
  display : function()
  {
      LevelRevealSequence.update();
  }

};
