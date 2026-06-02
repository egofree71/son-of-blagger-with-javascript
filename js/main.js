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
	GameInitializer.create();
}

function updateGame()
{
	GameController.update();
}
