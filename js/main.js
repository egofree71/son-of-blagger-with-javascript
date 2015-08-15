"use strict";

var map;
var keyPressed;
var layer;

var vanishingPlatformGroup;

var game = new Phaser.Game(640, 400, Phaser.AUTO, '', { preload: preload, create: create, update: updateGame });

// Load assets
function preload()
{
	// Load the map and its tileset
	game.load.tilemap('map', 'assets/maps/son-of-blagger.json', null, Phaser.Tilemap.TILED_JSON);
	game.load.image('background', 'assets/tileset/background.png');
	game.load.image('monsters', 'assets/tileset/monsters.png');

	// Load sprites
	game.load.spritesheet('blagger', 'assets/sprites/blagger.png', 48, 42);
	game.load.spritesheet('blaggerWhite', 'assets/sprites/blagger white.png', 48, 42);
	game.load.spritesheet('blaggerDying', 'assets/sprites/blagger dying.png', 36, 42);
	game.load.spritesheet('blaggerDyingWhite', 'assets/sprites/blagger dying white.png', 36, 42);

	game.load.spritesheet('shoe', 'assets/sprites/shoe.png', 48, 42);
	game.load.spritesheet('heart', 'assets/sprites/heart.png', 48, 42);
	game.load.spritesheet('mouth', 'assets/sprites/mouth.png', 48, 42);
	game.load.spritesheet('toothbrush', 'assets/sprites/toothbrush.png', 48, 42);
	game.load.spritesheet('scissors', 'assets/sprites/scissors.png', 48, 42);
	game.load.spritesheet('ghost', 'assets/sprites/ghost.png', 48, 42);
	game.load.spritesheet('peach', 'assets/sprites/peach.png', 48, 42);
	game.load.spritesheet('dial', 'assets/sprites/dial.png', 48, 42);
	game.load.spritesheet('candle', 'assets/sprites/candle.png', 48, 42);
	game.load.spritesheet('tape', 'assets/sprites/tape.png', 48, 42);
	game.load.spritesheet('tribble', 'assets/sprites/tribble.png', 48, 42);
	game.load.spritesheet('bird', 'assets/sprites/bird.png', 48, 42);
	game.load.spritesheet('bus', 'assets/sprites/bus.png', 48, 42);
	game.load.spritesheet('cup', 'assets/sprites/cup.png', 48, 42);
	game.load.spritesheet('plane', 'assets/sprites/plane.png', 48, 42);
	game.load.spritesheet('scare crow', 'assets/sprites/scare crow.png', 48, 42);
	game.load.spritesheet('flag', 'assets/sprites/flag.png', 48, 42);
	game.load.spritesheet('skull', 'assets/sprites/skull.png', 48, 42);
	game.load.spritesheet('keyboard', 'assets/sprites/keyboard.png', 48, 42);
	game.load.spritesheet('phone', 'assets/sprites/phone.png', 48, 42);
	game.load.spritesheet('commodore', 'assets/sprites/commodore.png', 48, 42);
	game.load.spritesheet('alien_2', 'assets/sprites/alien_2.png', 48, 42);
	game.load.spritesheet('alien_3', 'assets/sprites/alien_3.png', 48, 42);
	game.load.spritesheet('explosion', 'assets/sprites/explosion.png', 48, 42);
	game.load.spritesheet('reverseExplosion', 'assets/sprites/reverse explosion.png', 48, 42);

	game.load.spritesheet('bonusMan', 'assets/sprites/bonus man.png', 112, 14);
	game.load.spritesheet('title', 'assets/sprites/title.png', 272, 82);
	game.load.spritesheet('game over', 'assets/sprites/game over.png', 360, 90);
	game.load.spritesheet('end level', 'assets/sprites/end level.png', 16, 16);
	game.load.spritesheet('conveyorRight', 'assets/sprites/conveyor right.png', 16, 16);
	game.load.spritesheet('conveyorLeft', 'assets/sprites/conveyor left.png', 16, 16);
	game.load.spritesheet('ladderLeft', 'assets/sprites/ladder left.png', 16, 16);
	game.load.spritesheet('ladderRight', 'assets/sprites/ladder right.png', 16, 16);
	game.load.spritesheet('waveLeft', 'assets/sprites/wave left.png', 16, 16);
	game.load.spritesheet('waveRight', 'assets/sprites/wave right.png', 16, 16);
	game.load.spritesheet('vanishingPlatform', 'assets/sprites/vanishing platform.png', 16, 16);

	game.load.image('blaggerFont', 'assets/tileset/fonts.png');
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

	// Create the black rectangles used to display progressively the map
	Level.createBlackRectangles();

	GameController.gameState = "load introduction";
}


function updateGame()
{
	GameController.update();
}
