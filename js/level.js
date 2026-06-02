var Level =
{
  // Current level
  level : LevelConstants.INITIAL_LEVEL,

  // Rectangles which are used to display progressively the map
  upperBlackRectangle : null,
  lowerblackRectangle : null,

  rectangleHeight : 0,
  rectangleWidth : 0,

  // Counter used to set the animation's speed
  counterDisplayingLevel : LevelConstants.DISPLAY_REVEAL_INITIAL_COUNTER,

  // Variable used to run the progressive level reveal sequence.
  // The end-level and end-game transitions are handled by dedicated objects.
  stepDisplayLevel : LevelConstants.INITIAL_SEQUENCE_STEP,

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

  // Create black rectangles used to display progressively the map
  createBlackRectangles : function()
  {
      this.upperBlackRectangle  = game.add.graphics();
      this.upperBlackRectangle.fixedToCamera = true;
      this.lowerblackRectangle  = game.add.graphics();
      this.lowerblackRectangle.fixedToCamera = true;
  },

  initMonsters : function()
  {
      this.explosions = game.add.group();
      this.explosions.enableBody = true;

      this.reverseExplosions = game.add.group();
      this.reverseExplosions.enableBody = true;

  },

  // Add the monsters for the current level
  addMonsters : function()
  {
      // find all monsters in the map for the given level
      var monstersProperties = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, this.level, LevelConstants.OBJECT_LAYER_MONSTERS);

      // If we are restarting the current level, destroy previous monsters
      for (var i = 0; i < this.monsters.length; i++)
        this.monsters[i].sprite.destroy();

      this.monsters = [];

      // Create new monster objects and store them into monsters
      for (var i = 0; i < monstersProperties.length; i++)
      {
        // get the bounding box properties for collision stored in the tilset properties
        var tileProperties = Util.getMonstersTileProperties(monstersProperties[i].type);
        var monster = new Monster(monstersProperties[i], tileProperties);
        this.monstersGroup.add(monster.sprite);
        this.monsters.push(monster);
      }

      // Get the animation counter maximum used to set the animation's speed
      this.animationCounterMax = Data.levels[this.level-1][1];
      this.animationCounter = this.animationCounterMax;

      // Hide the monsters
      for (var i = 0; i < this.monsters.length; i++)
        this.monsters[i].sprite.visible = false;
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

  // Load the objects needed for a given level
  load : function()
  {
  	// Reset level properties
    this.airLevel = LevelConstants.DEFAULT_AIR_LEVEL;
    this.keysTaken = 0;
    this.bonusMan = false;

    Player.reset();
    this.addMonsters();

  	// find all 'end level' objects in the map
  	var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, this.level, LevelConstants.OBJECT_LAYER_END_LEVEL);

  	// If the 'end level' object is not yet defined for the current level, create it
  	if (!this.endLevel)
  	{
        this.endLevel = game.add.sprite(results[0].x, results[0].y - LevelConstants.END_LEVEL_Y_OFFSET, LevelConstants.SPRITE_END_LEVEL);
        this.endLevel.alpha = 0;
  	}
  	else
  	{
        this.endLevel.reset(results[0].x, results[0].y - LevelConstants.END_LEVEL_Y_OFFSET);
  	}

  },

  // Display progressively the map with two disappearing black rectangles
  display : function()
  {
  	switch (this.stepDisplayLevel)
  	{
  		// Initialize the rectangles and reset the keys
  		case LevelConstants.DISPLAY_STEP_INITIALIZE:

            this.rectangleHeight = game.camera.height/2;
            this.rectangleWidth = game.camera.width;

  			// Show again all keys
  			map.forEach(function(tile)
  			{
  				if (tile.index == LevelConstants.TILE_KEY_INDEX) tile.alpha = 1;
  			});

            this.stepDisplayLevel++;
  			break;

  		case LevelConstants.DISPLAY_STEP_REVEAL:
            this.counterDisplayingLevel -= 1;

  			// Draw the upper black background
            this.upperBlackRectangle.clear();
            this.upperBlackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
            this.upperBlackRectangle.drawRect(0, 0, game.camera.width, this.rectangleHeight);
            this.upperBlackRectangle.endFill();

  			// Draw the lower black background
            this.lowerblackRectangle.clear();
            this.lowerblackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
            this.lowerblackRectangle.drawRect(0, game.camera.height - this.rectangleHeight, game.camera.width, this.rectangleHeight);
            this.lowerblackRectangle.endFill();


  			if (this.counterDisplayingLevel == 0)
  			{
                this.counterDisplayingLevel = LevelConstants.DISPLAY_REVEAL_COUNTER_RESET;
                this.rectangleHeight -= LevelConstants.DISPLAY_REVEAL_HEIGHT_STEP;
  			}

  			// If the rectangles are gone, start the game
  			if (this.rectangleHeight <= 0)
  			{
                this.upperBlackRectangle.clear();
                this.lowerblackRectangle.clear();
                this.stepDisplayLevel = LevelConstants.INITIAL_SEQUENCE_STEP;
  				GameController.gameState = GameStates.START_LEVEL;
  			}

  	}

  }

}
