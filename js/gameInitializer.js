/**
 * Initializes the Phaser runtime once all assets have been preloaded.
 *
 * main.js owns the Phaser lifecycle callbacks, while this object owns the
 * startup sequence that wires together the map, animated tiles, input, HUD,
 * player, monsters, and initial game state.
 */
var GameInitializer =
{
    create : function()
    {
        this.configureScaling();
        this.startPhysics();
        this.createMap();
        this.createAnimatedTiles();
        this.createRuntimeGroups();
        this.createPlayerAndMonsters();
        this.createInput();
        this.loadHiScore();
        this.initializeHud();
        this.createScreenOverlays();
        this.startAtIntroduction();
    },

    configureScaling : function()
    {
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.setScreenSize(true);
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
    },

    startPhysics : function()
    {
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.stage.backgroundColor = '#c0c0c0';
    },

    createMap : function()
    {
        map = game.add.tilemap('map');
        map.addTilesetImage('background', 'background');
        map.addTilesetImage('monsters', 'monsters');

        layer = map.createLayer('background');
        layer.resizeWorld();
    },

    createAnimatedTiles : function()
    {
        Util.createSpritesFromTiles(17, 'conveyorRight', 30);
        Util.createSpritesFromTiles(16, 'conveyorLeft', 30);
        Util.createSpritesFromTiles(28, 'ladderLeft', 30);
        Util.createSpritesFromTiles(29, 'ladderRight', 30);
        Util.createSpritesFromTiles(31, 'waveLeft', 30);
        Util.createSpritesFromTiles(32, 'waveRight', 30);

        vanishingPlatformGroup = Util.createSpritesFromTiles(33, 'vanishingPlatform', 2);
    },

    createRuntimeGroups : function()
    {
        Level.monstersGroup = game.add.group();
    },

    createPlayerAndMonsters : function()
    {
        Player.create();
        Level.initMonsters();

        Player.playerSprite.bringToTop();
    },

    createInput : function()
    {
        keyPressed = game.input.keyboard.createCursorKeys();
    },

    loadHiScore : function()
    {
        GameController.hiScore = localStorage.getItem('hiScore');

        if (!GameController.hiScore)
            GameController.hiScore = 0;
    },

    initializeHud : function()
    {
        HUD.init();
    },

    createScreenOverlays : function()
    {
        LevelRevealSequence.createBlackRectangles();
    },

    startAtIntroduction : function()
    {
        GameController.gameState = GameStates.LOAD_INTRODUCTION;
    }
};
