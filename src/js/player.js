import { GameStates } from "./gameStates.js";
import { PlayerStates } from "./playerStates.js";
import { LevelConstants } from "./levelConstants.js";
import { Util } from "./util.js";
import { PlayerMovement } from "./playerMovement.js";
import { PlayerInteractions } from "./playerInteractions.js";
import { PlayerDeathSequence } from "./playerDeathSequence.js";

export const Player =
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
		this.playerSprite = game.add.sprite(0, 0, PlayerStates.SPRITE_BLAGGER);
		game.physics.arcade.enable(this.playerSprite);

		// Set the animations for the player
		this.playerSprite.animations.add(PlayerStates.ANIMATION_RIGHT, [6, 7, 8, 9, 10, 11], 10, true);
		this.playerSprite.animations.add(PlayerStates.ANIMATION_LEFT, [0, 1, 2, 3, 4, 5], 10, true);
	},

	// Reset player's properties
	reset : function()
	{
		// find player's position for the current level
		var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, Level.level, LevelConstants.OBJECT_LAYER_PLAYER);

		//
		this.playerSprite.reset(results[0].x, results[0].y - LevelConstants.PLAYER_TILED_Y_OFFSET);
		this.playerSprite.loadTexture(PlayerStates.SPRITE_BLAGGER);
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

		var movementResult = PlayerMovement.update(this);

		if (movementResult.checkInteractions)
			PlayerInteractions.update(this, movementResult.x, movementResult.y);
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

	// When the player is killed, delegate the death animation and life handling.
	kill : function()
	{
		PlayerDeathSequence.start(this);
	}

};

window.Player = Player;
