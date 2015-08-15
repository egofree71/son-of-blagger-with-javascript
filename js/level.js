var Level =
{
  // Current level
  level : 1,

  // Rectangles which are used to display progressively the map
  upperBlackRectangle : null,
  lowerblackRectangle : null,

  rectangleHeight : 0,
  rectangleWidth : 0,

  // Counter used to set the animation's speed
  counterDisplayingLevel : 1,
  counterEndLevel : 4,

  // Variables used to run sequences when transition occurs between levels
  stepDisplayLevel : 1,
  stepEndLevel : 1,
  stepEndGame : 1,

  // Player's position for the next level
  nextLevelPlayerPositionX : 0,
  nextLevelPlayerPositionY : 0,

  // air level of the current level
  airLevel : 480,

  // Array which contains all monsters for a given level
  monsters : [],
  // Group which contains the monsters (used for display order)
  monstersGroup : null,

  animationCounterMax : 0,
  animationCounter : 0,

  // Group which contains 'explosion' objecst displayed when showing monsters
  explosions : null,
  // Group which contains ' reverse explosion' objecst displayed when hiding monsters of the previous level
  reverseExplosions : null,
  // The end level object stores the position of the end's level
  endLevel : null,

  // Image which contains the congratulations message
  congratulationsImage : null,
  counter : 0,

  // The introduction logo
  introductionLogo : null,
  fontIntroduction : null,
  // The game over logo
  gameOver : null,

  // Number of keys taken in the current level
  keysTaken : 0,
  bonusMan : false,

  resetAirLevel : function()
  {
      this.airLevel = 480;
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
      var monstersProperties = Util.findObjectsByProperty(map, 'level', this.level, 'monsters');

      // If we are restarting the current level, destroy previous monsters
      for (i=0; i < this.monsters.length; i++)
        this.monsters[i].sprite.destroy();

      this.monsters = [];

      // Create new monster objects and store them into monsters
      for (i=0; i < monstersProperties.length; i++)
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
      for (i=0; i < this.monsters.length; i++)
        this.monsters[i].sprite.visible = false;
  },

  // Update monsters position
  updateMonsters : function()
  {
      for (i=0; i < this.monsters.length; i++)
          this.monsters[i].updatePosition();
  },

  // Before displaying monsters, show 'explosions'
  displayMonsters : function()
  {
    this.explosions.removeAll(true);

    // Display an explosion for each monster
    for (i=0; i < this.monsters.length; i++)
    {
  		var explosion = this.explosions.create(this.monsters[i].firstPositionX, this.monsters[i].firstPositionY, 'explosion');
  		var anim = explosion.animations.add('explosion');

  		anim.onComplete.add(function()
  		{
  			// Show the monsters and start playing
            Level.monsters.alpha = 1;

            // Show the monsters
            for (i=0; i < Level.monsters.length; i++)
                Level.monsters[i].sprite.visible = true;

  			GameController.gameState = "playing";
  		});

  		explosion.animations.play('explosion', 18, false, true);
  	}

  	GameController.gameState = "displaying monsters";
  },

  // Display the introduction title
  displayIntroduction : function()
  {
  	// Draw a blakc rectangle behind the title
    this.upperBlackRectangle.beginFill(0x000000, 1);
    this.upperBlackRectangle.drawRect(0, 0, game.camera.width,  game.camera.height);

  	// Display the title
    this.introductionLogo = game.add.sprite(180, 50, 'title');
    this.introductionLogo.fixedToCamera = true;

    this.fontIntroduction = Util.drawFontText("press any key to start or h for help", 2, 11);
  },

  // Remove the introduction title
  removeIntroduction : function()
  {
    this.introductionLogo.destroy();
    this.fontIntroduction.clear();
  },

  // Display game over logo
  displayGameOver : function()
  {
    this.gameOver = game.add.sprite(140, 50, 'game over');
    this.gameOver.fixedToCamera = true;
  },

  // Display a screen with instructions
  displayInstructions : function()
  {
  	// Draw a blakc rectangle
    this.upperBlackRectangle.beginFill(0x000000, 1);
    this.upperBlackRectangle.drawRect(0, 0, game.stage.width, game.stage.height);

  	var font = game.add.retroFont('blaggerFont', 16, 16, Phaser.RetroFont.TEXT_SET2);
  	font.setText ("Players control Slippery Sid, who is an\n" +
  				  "an espionage agent and son of blagger.\n" +
  		          "Like the first game, the task is to \n" +
  				  "collect a series of keys scattered \n" +
  				  "around the level. Sid must navigate \n" +
  				  "a series of platforms while jumping \n" +
  				  "over robots that guard the keys. Once \n" +
  				  "Sid collects all the keys, he can make\n" +
  				  "his way to the next level by going\n" +
  				  "through a doorway. Like his father, Sid\n" +
  				  "has a limited time to perform this task,\n" +
  				  "and he loses one of his lives if he\n" +
  				  "falls long distances.\n" +
  				  "\n"+
  				  "Controls : left and right arrows \n" +
  				  "to go left and right and space bar \nto jump.", true, 0, 6);

  	var image = game.add.image(10 , 10, font);
  	image.tint = 0xc0c0c0;
  	image.fixedToCamera = true;

  	// If the user pressed a key, go back to the introduction screen
  	game.input.keyboard.onPressCallback = function(key)
  	{
  		image.destroy();
        Level.upperBlackRectangle.clear();
  		game.input.keyboard.onPressCallback = null;

  		GameController.gameState = "load introduction";
  	};

  },

  // Display the congratulations message when the game is finished
  endGame : function()
  {
  	switch(this.stepEndGame)
  	{
  		// Increase the score according to the remaining air level
  		case 1:
  			if (this.airLevel > 0)
  			{
                this.airLevel -=6;
  				GameController.score += 30;
  				HUD.displayScore();
  				HUD.displayAirLevel();
  			}
  			else
  			{
  				HUD.clearAirLevel();
                this.airLevel = 480;
                this.stepEndGame += 1;
  			}

  			break;

        // Display a congratulations message
  		case 2:
            this.stepEndGame++;
  			// Draw a black rectangle
            this.upperBlackRectangle.beginFill(0x000000, 1);
            this.upperBlackRectangle.drawRect(0, 0, game.stage.width, game.stage.height);

  			var font = game.add.retroFont('blaggerFont', 16, 16, Phaser.RetroFont.TEXT_SET2);
  			font.setText ("Congratulations !\n      you\nfinished the game", true, 1 ,18);

            this.congratulationsImage = game.add.image(60 , 100, font);
            this.congratulationsImage.tint = 0xFFFFFF;
            this.congratulationsImage.fixedToCamera = true;

  			// Scale down the message
            this.congratulationsImage.scale.x = 0.1;
            this.congratulationsImage.scale.y = 0.1;

            this.counter = 220;
  			break;

  		// Scale up the message
  		case 3:
            this.congratulationsImage.scale.x += 0.005;
            this.congratulationsImage.scale.y += 0.005;

  			if (this.congratulationsImage.scale.x > 1.8)
              this.stepEndGame++;

  			break;

        // Wait a little bit, and show the introduction screen
  		case 4:
            this.counter--;

  			if (this.counter == 0)
  			{
                this.upperBlackRectangle.clear();
                this.congratulationsImage.destroy();
                this.stepEndGame = 1;
                this.resetGame();
  				HUD.displayAirLevel();
  				GameController.gameState = "load introduction";
  			}
  	}
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

    this.level = 1;
  	GameController.score = 0;
  	GameController.lives = 3;

    HUD.update();
  },

  // Move the player to the next level and increase score according to the air's level
  goToNext : function()
  {
  	switch(this.stepEndLevel)
  	{
        // Get the player's position for the next level
  	    case 1:
            this.level++;
  			var results = Util.findObjectsByProperty(map, 'level', this.level, 'player');

            this.nextLevelPlayerPositionX = results[0].x
            this.nextLevelPlayerPositionY = results[0].y - 42;

            this.stepEndLevel++;
  			break;

  		// Set the background color to red and display an explosion for each monster
  		case 2:
  			game.stage.backgroundColor = '#ff0000';

  			// Hide monsters
            for (i=0; i < Level.monsters.length; i++)
                Level.monsters[i].sprite.visible = false;

            this.reverseExplosions.removeAll(true);

  			// Display an 'reverse explosion' for each monster
            for (i=0; i < this.monsters.length; i++)
            {
  				var reverseExplosion = this.reverseExplosions.create(this.monsters[i].sprite.body.x, this.monsters[i].sprite.body.y, 'reverseExplosion');
  				var anim = reverseExplosion.animations.add('reverseExplosion');

                reverseExplosion.animations.play('reverseExplosion', 18, false, true);
  			}

            this.stepEndLevel += 1;
  			break;

  		// Switch back the background to the original color
  		case 3:
            this.counterEndLevel -= 1;

  			if (this.counterEndLevel == 0)
                this.stepEndLevel += 1;

  			game.stage.backgroundColor = '#c0c0c0';

            this.stepEndLevel += 1;

          	break;

  		// Decrease slowly the small horizontal/vertical distance to the next level
  	    case 4:
  	        // Horizontal and vertical distances to the next level
  	        horizontalDistance = Player.playerSprite.body.x - this.nextLevelPlayerPositionX;
  	        verticalDistance = Player.playerSprite.body.y - this.nextLevelPlayerPositionY;

  	        if (Math.abs(verticalDistance == 0) || Math.abs(horizontalDistance == 0))
  	        {
                this.stepEndLevel += 1;
  	            break;
  	        }

  	        if (Math.abs(verticalDistance) < Math.abs(horizontalDistance))
  	        {
  	            if (verticalDistance > 0)
  					Player.playerSprite.body.y -= 1;
  	            else
  					Player.playerSprite.body.y += 1;
  	        }
  	        else
  	        {
  	            if (horizontalDistance > 0)
  					Player.playerSprite.body.x -= 1;
  	            else
  					Player.playerSprite.body.x += 1;
  	        }

  	        break;

  		// Increase the score according to the remaining air level
  	    case 5:
  	        if (this.airLevel > 0)
  	        {
                this.airLevel -=6;
  				GameController.score += 30;
  				HUD.displayScore();
  				HUD.displayAirLevel();
  	        }
  	        else
  	        {
  				HUD.clearAirLevel();
                this.stepEndLevel += 1;
  	        }

            this.counterEndLevel = 4;

  		break;

  		//  Move the player to the position of the next level
  		case 6:
            this.counterEndLevel -= 1;
  			if (this.counterEndLevel > 0) break;
            this.counterEndLevel = 4;

  			horizontalDistance = Player.playerSprite.body.x - this.nextLevelPlayerPositionX;
  			verticalDistance = Player.playerSprite.body.y - this.nextLevelPlayerPositionY;

  			if (verticalDistance == 0 && horizontalDistance == 0)
  			{
                this.stepEndLevel += 1;
  				break;
  			}

  			if (verticalDistance == 0)
  			{
  				if (Math.abs(horizontalDistance) < 16)
  				{
  					Player.playerSprite.body.x = this.nextLevelPlayerPositionX;
                    this.stepEndLevel += 1;
  					break;
  				}

  				if (horizontalDistance > 0)
  					Player.playerSprite.body.x -= 16;
  				else
  					Player.playerSprite.body.x += 16;
  			}
  			else
  			{
  				if (Math.abs(verticalDistance) < 16)
  				{
  					Player.playerSprite.body.y = this.nextLevelPlayerPositionY;
                    this.stepEndLevel += 1;
  					break;
  				}

  				if (verticalDistance > 0)
  					Player.playerSprite.body.y -= 16;
  				else
  					Player.playerSprite.body.y += 16;
  			}

  			break;

  		// Replenish the air
  		case 7:
  			if (this.airLevel < 480)
  			{
                this.airLevel +=6;
  				HUD.displayAirLevel();
  			}
  			else
  			{
                this.stepEndLevel += 1;
  			}

  			break;

  		// Load next level and start playing
  		case 8:
  			this.load();
  			HUD.update();
            this.stepEndLevel = 1;
  			// On every new level, the user gets a 'bonus man'
            this.bonusMan = true;
  			GameController.gameState = "start level";
  			break;


  	}
  },

  // Load the objects needed for a given level
  load : function()
  {
  	// Reset level properties
    this.airLevel = 480;
    this.keysTaken = 0;
    this.bonusMan = false;

    Player.reset();
    this.addMonsters();

  	// find all 'end level' objects in the map
  	var results = Util.findObjectsByProperty(map, 'level', this.level, 'end level');

  	// If the 'end level' object is not yet defined for the current level, create it
  	if (!this.endLevel)
  	{
        this.endLevel = game.add.sprite(results[0].x, results[0].y - 16, 'end level');
        this.endLevel.alpha = 0;
  	}
  	else
  	{
        this.endLevel.reset(results[0].x, results[0].y - 16);
  	}

  },

  // Display progressively the map with two dissapearing black rectangles
  display : function()
  {
  	switch (this.stepDisplayLevel)
  	{
  		// Initalize the rectangles and reset the keys
  		case 1:

            this.rectangleHeight = game.camera.height/2;
            this.rectangleWidth = game.camera.width;

  			// Show again all keys
  			map.forEach(function(tile)
  			{
  				if (tile.index == 40) tile.alpha = 1;
  			});

            this.stepDisplayLevel++;
  			break;

  		case 2:
            this.counterDisplayingLevel -= 1;

  			// Draw the upper black background
            this.upperBlackRectangle.clear();
            this.upperBlackRectangle.beginFill(0x000000, 1);
            this.upperBlackRectangle.drawRect(0, 0, game.camera.width, this.rectangleHeight);
            this.upperBlackRectangle.endFill();

  			// Draw the lower black background
            this.lowerblackRectangle.clear();
            this.lowerblackRectangle.beginFill(0x000000, 1);
            this.lowerblackRectangle.drawRect(0, game.camera.height - this.rectangleHeight, game.camera.width, this.rectangleHeight);
            this.lowerblackRectangle.endFill();


  			if (this.counterDisplayingLevel == 0)
  			{
                this.counterDisplayingLevel = 2;
                this.rectangleHeight -=2;
  			}

  			// If the rectangles are gone, start the game
  			if (this.rectangleHeight <= 0)
  			{
                this.upperBlackRectangle.clear();
                this.lowerblackRectangle.clear();
                this.stepDisplayLevel = 1;
  				GameController.gameState = "start level";
  			}

  	}

  }

}
