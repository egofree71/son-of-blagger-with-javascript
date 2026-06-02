"use strict";

var map;
var keyPressed;
var layer;

var vanishingPlatformGroup;

var game = new Phaser.Game(640, 400, Phaser.AUTO, '', { preload: preload, create: create, update: updateGame });

// Load all Phaser assets before create() runs.
function preload()
{
	AssetLoader.preload();
}

function create()
{
	// Set scaling
	game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
	//screen size will be set automatically
	game.scale.setScreenSize(true);
	// center the game
	game.scale.pageAlignHorizontally = true;
	game.scale.pageAlignVertically = true;

	//  Set the physics system
	game.physics.startSystem(Phaser.Physics.ARCADE);

	game.stage.backgroundColor = '#c0c0c0';

	// Load the map
	map = game.add.tilemap('map');
	map.addTilesetImage('background', 'background');
	map.addTilesetImage('monsters', 'monsters');
	layer = map.createLayer('background');
	layer.resizeWorld();

	// Create sprites for the animated tiles
	Util.createSpritesFromTiles(17, 'conveyorRight', 30);
	Util.createSpritesFromTiles(16, 'conveyorLeft', 30);
	Util.createSpritesFromTiles(28, 'ladderLeft', 30);
	Util.createSpritesFromTiles(29, 'ladderRight', 30);
	Util.createSpritesFromTiles(31, 'waveLeft', 30);
	Util.createSpritesFromTiles(32, 'waveRight', 30);
	vanishingPlatformGroup = Util.createSpritesFromTiles(33, 'vanishingPlatform', 2);

	Level.monstersGroup = game.add.group();

	Player.create();
	Level.initMonsters();

	Player.playerSprite.bringToTop();

	// Store the key pressed
	keyPressed = game.input.keyboard.createCursorKeys();

	GameController.hiScore = localStorage.getItem('hiScore');

	if (!GameController.hiScore) GameController.hiScore = 0;

	// Initialize HUD
	HUD.init();

	// Create the black rectangles used by the level reveal and screen overlays.
	LevelRevealSequence.createBlackRectangles();

	GameController.gameState = GameStates.LOAD_INTRODUCTION;
}


function updateGame()
{
	GameController.update();
}
