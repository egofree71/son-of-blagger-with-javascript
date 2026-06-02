var Player =
{
	// Show if the player is jumping
	jumping : false,
	// The index in the jump animation
	jumpIndex : 0,
	// Show the horizontal direction of the jump
	jumpingDirection : null,
	// When player is falling, store the fall height
	fallHeight : 0,
	// If the player exceeds this limit, the fall is deadly
	fallLimit : 72,
	deadlyFall : false,

	playerSprite : null,
	playerDyingSprite : null,

	animationMaxCounter : 5,
	animationLeftCounter : 0,
	animationRightCounter : 0,

	create : function()
	{
		// Create the playerSprite
		this.playerSprite = game.add.sprite(0, 0, 'blagger');
		game.physics.arcade.enable(this.playerSprite);

		//  Set the animations for the player
		this.playerSprite.animations.add(PlayerStates.ANIMATION_DYING, [0, 1, 2, 3, 4, 5, 6, 7], 10, true);
		this.playerSprite.animations.add(PlayerStates.ANIMATION_RIGHT, [6, 7, 8, 9, 10, 11], 10, true);
		this.playerSprite.animations.add(PlayerStates.ANIMATION_LEFT, [0, 1, 2, 3, 4, 5], 10, true);
	},

	// Reset player's properties
	reset : function()
	{
		// find player's position for the current level
		var results = Util.findObjectsByProperty(map, 'level', Level.level, 'player');

		//
		this.playerSprite.reset(results[0].x, results[0].y - 42);
		this.playerSprite.loadTexture('blagger');
		this.playerSprite.animations.play(PlayerStates.ANIMATION_RIGHT);
		this.playerSprite.animations.stop();

		game.camera.follow(this.playerSprite);

		this.animationLeftCounter = this.animationMaxCounter;
		this.animationRightCounter = this.animationMaxCounter;

		this.jumping = false;
		this.jumpIndex = 0;
		this.jumpingDirection = null;
		this.deadlyFall = false;

		this.fallHeight = 0;
	},

	update : function()
	{
		if (GameController.gameState != GameStates.PLAYING) return ;

		// Store the direction of the playerSprite
		var horizontalDirection = null;
		var verticalDirection = null;

		// Store player position
		var x = this.playerSprite.body.x;
		var y = this.playerSprite.body.y;

		// If it's a deadly fall
		if (this.deadlyFall)
		{
			this.playerSprite.body.y += 1;

		    // if the player meets anything, end the fall
		    if (Util.horizontalCollisionLine(x + 7, x + 23, y + this.playerSprite.body.height, "type", "solid", true))
		    {
				fallHeight = 0;
				this.kill();
		    }

		    return;
		}

		// If the player is not falling and not jumping
		if (this.fallHeight == 0 && this.jumping == false)
		{
		    // If the player wants to jump
		    if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR))
		    {
				this.jumping = true;
				this.jumpIndex = 0;
				this.jumpingDirection = null;
		    }

		    // If the player wants to go right
		    if (keyPressed.right.isDown)
		    {
		        if (this.jumping)
					this.jumpingDirection = PlayerStates.RIGHT;

				horizontalDirection = PlayerStates.RIGHT;

				// If previously the player was going to the left, reset the animation to the right
				if (this.playerSprite.animations.currentAnim.name == PlayerStates.ANIMATION_LEFT)
				{
					this.playerSprite.animations.play(PlayerStates.ANIMATION_RIGHT);
					this.playerSprite.animations.stop();
					this.animationRightCounter = this.animationMaxCounter;
				}

				this.playRight();

		    }

		    // If the player wants to go left
		    if (keyPressed.left.isDown)
		    {
		        if (this.jumping)
					this.jumpingDirection = PlayerStates.LEFT;

				horizontalDirection = PlayerStates.LEFT;

				// If previously the player was going to the right, reset the animation to the left
				if (this.playerSprite.animations.currentAnim.name == PlayerStates.ANIMATION_RIGHT)
				{
					this.playerSprite.animations.play(PlayerStates.ANIMATION_LEFT);
					this.playerSprite.animations.stop();
					this.animationLeftCounter = this.animationMaxCounter;
				}

				this.playLeft();

		    }
		}

		if (this.jumping)
		{
		   if (this.jumpingDirection == PlayerStates.LEFT)
			this.playLeft();

		   if (this.jumpingDirection == PlayerStates.RIGHT)
			this.playRight();

			this.jumpIndex +=1;

		    // If the player begins the fall
		    if (this.jumpIndex >= 50)
		    {
				this.fallHeight += 1;

		        // Test if there is an object under the player
		        if (Util.horizontalCollisionLine(x + 7, x + 23, y + this.playerSprite.body.height, "type", "solid", true) ||
					Util.horizontalCollisionLine(x + 7, x + 23, y + this.playerSprite.body.height, "type", "slide", true) ||
					Util.collisionLineWithVanishingPlatform(x + 7, x + 23, y + this.playerSprite.body.height))
				{
					this.jumping = false;
					this.fallHeight = 0;
					this.playerSprite.animations.stop();
		        }
				// If it's a deadly fall, display the white sprites
				else if (this.fallHeight == this.fallLimit)
				{
					this.deadlyFall = true;
					this.playerSprite.loadTexture('blaggerWhite', this.playerSprite.animations.currentAnim.frame);
				}

		    }

		    // If the player is still jumping
		    if (this.jumping == true)
		    {
				verticalDirection = Data.jumpPath[this.jumpIndex][1];

				// If the jump position does not have an horizontal direction
		      	if (Data.jumpPath[this.jumpIndex][0] == false)
		      		horizontalDirection = null;
		      	else
		      		horizontalDirection = this.jumpingDirection;

				if (this.jumpIndex >= Data.jumpPath.length-1)
					this.jumping = false;
		    }

		}

		if (this.jumping == false)
		{
			// If the player is on a slide going left
			if (Util.horizontalCollisionLine(x + 7, x + 23, y + this.playerSprite.body.height + 14, "name", "left slide", false))
			{
				horizontalDirection = PlayerStates.LEFT;
				verticalDirection = PlayerStates.DOWN;
				this.fallHeight = 0;
			}

			// If the player is on a slide going right
			if (Util.horizontalCollisionLine (x + 7, x + 23, y + this.playerSprite.body.height + 14, "name", "right slide", false))
			{
				horizontalDirection = PlayerStates.RIGHT;
				verticalDirection = PlayerStates.DOWN;
				this.fallHeight = 0;
			}

			// If the player is not sliding
		    if (verticalDirection == null)
		    {
		        // Test if the player is falling
				if (Util.horizontalCollisionLine(x + 7, x + 23, y + this.playerSprite.body.height, "type", "solid", false) == false &&
					Util.collisionLineWithVanishingPlatform(x + 7, x + 23, y + this.playerSprite.body.height) == false)
				{
					verticalDirection = PlayerStates.DOWN;
					horizontalDirection = null;
					this.playerSprite.animations.stop();

					this.fallHeight +=1;

		            // If it's a deadly fall, display the white sprites
		            if (this.fallHeight == this.fallLimit)
		            {
						this.deadlyFall = true;
						this.playerSprite.loadTexture('blaggerWhite', this.playerSprite.animations.currentAnim.frame);
		            }
		        }
		        else
		        {
					this.fallHeight = 0;
		        }
		    }

			// If the player is on a conveyor going right
			if (Util.horizontalCollisionLine(x + 7,  x + 23, y + this.playerSprite.body.height, "name", "conveyor right", false))
			{
				if (horizontalDirection == PlayerStates.LEFT)
					horizontalDirection = null;
				else
					horizontalDirection = PlayerStates.RIGHT;
			}

			// If the player is on a conveyor going left
			if (Util.horizontalCollisionLine(x + 7,  x + 23, y + this.playerSprite.body.height, "name", "conveyor left", false))
			{
				if (horizontalDirection == PlayerStates.RIGHT)
					horizontalDirection = null;
				else
					horizontalDirection = PlayerStates.LEFT;
			}

			// If the player is on a ladder
			if (Util.collisionRectangle(x + 7, y + this.playerSprite.body.height - 18, x + 23, y + this.playerSprite.body.height - 1, "name", "ladder"))
				verticalDirection = PlayerStates.UP;

			if (keyPressed.left.isUp && keyPressed.right.isUp)
				this.playerSprite.animations.stop();
		}

		// If the player is under a wall
		if (verticalDirection == PlayerStates.UP && Util.horizontalCollisionLine (x + 7 , x + 23,  y - 2, "name", "wall"))
			verticalDirection = null;

		 // If there is something blocking on the right
		if (horizontalDirection == PlayerStates.RIGHT && Util.verticalCollisionLine(y + 6, y + this.playerSprite.body.height - 1, x + 24, "name", "wall", false))
			horizontalDirection = null;

		// if there nothing blocking on the left
		if (horizontalDirection == PlayerStates.LEFT && Util.verticalCollisionLine(y + 6 ,y + this.playerSprite.body.height - 1, x + 5, "name", "wall", false))
			horizontalDirection = null;

		// Display the new position of the player
		if (horizontalDirection == PlayerStates.RIGHT)
			this.playerSprite.body.x += 1;

		if (horizontalDirection == PlayerStates.LEFT)
			this.playerSprite.body.x -= 1;

		if (verticalDirection == PlayerStates.DOWN)
			this.playerSprite.body.y += 1;

		if (verticalDirection == PlayerStates.UP)
			this.playerSprite.body.y -= 1;

		// If the player collides with a key
		if (Util.collisionRectangle(x + 7, y , x + 23, y + this.playerSprite.body.height, "name", "key", false))
		{
			Level.keysTaken++;

			// Increase the score
			GameController.score += 200;
			HUD.displayScore();

			// Hide the key
			Util.lastTileHit.alpha = 0;
			layer.dirty = true;
		}

		// If the player meets a deadly object
		if (Util.collisionRectangle (x + 5, y, x + 27, y + this.playerSprite.body.height - 1, "type", "deadly", false) ||
			Util.collisionRectangleWithMonsters(x + 4, y, x + 28, y + this.playerSprite.body.height))
			this.kill();


		// If the player has taken all level's keys, and if he is located on the next gate, go to the next level
		if (Level.keysTaken == Data.levels[Level.level-1][0] && Util.collisionRectangleWithEndLevel (x + 4, y, x + 28, y + this.playerSprite.body.height))
		{
			// If the player has finished the last level
			if (Level.level == Data.levels.length)
				GameController.gameState = GameStates.END_GAME;
			else
				GameController.gameState = GameStates.END_LEVEL;
		}
	},

	// Display player going left
	playLeft : function()
	{
		this.animationLeftCounter -= 1;

		if (this.animationLeftCounter == 0)
		{
			this.animationLeftCounter = this.animationMaxCounter;
			this.playerSprite.animations.getAnimation(PlayerStates.ANIMATION_LEFT).next();
		}

	},

	// Display player going right
	playRight : function()
	{
		this.animationRightCounter -= 1;

		if (this.animationRightCounter == 0)
		{
			this.animationRightCounter = this.animationMaxCounter;
			this.playerSprite.animations.getAnimation(PlayerStates.ANIMATION_RIGHT).next();
		}

	},

	// When the player is killed, display the 'dying' animation
	kill : function()
	{
		GameController.gameState = GameStates.KILL_PLAYER;
		this.playerSprite.visible = false;

		// Display blagger dying
		this.playerDyingSprite = game.add.sprite(this.playerSprite.body.x, this.playerSprite.body.y - 1, 'blaggerDying');
		var anim = this.playerDyingSprite.animations.add(PlayerStates.ANIMATION_BLAGGER_DYING);

		// If it's a deadly fall, display white sprites
		if (this.deadlyFall)
			this.playerDyingSprite.loadTexture("blaggerDyingWhite");

		// When the player has finished to die, reset the level's properties
		anim.onComplete.add(function()
		{
			// If there is the 'bonus man', remove it
			if (Level.bonusMan == true)
			{
				HUD.hideBonusMan();
				Level.bonusMan = false;
			}
			else
			{
				GameController.lives -= 1;
			}

			HUD.displayLives();

			Level.resetAirLevel();
			HUD.displayAirLevel();
			
			// If there are no lives left, the game is over
			if (GameController.lives == 0)
				GameController.gameState = GameStates.SHOW_GAME_OVER;
			else
				GameController.gameState = GameStates.LOAD_LEVEL;
		});

		this.playerDyingSprite.animations.play(PlayerStates.ANIMATION_BLAGGER_DYING, 6, false, true);
	}

}
