/**
 * Centralizes Phaser asset preloading.
 *
 * main.js owns the Phaser lifecycle, but the list of files to load is kept here
 * so startup code stays focused on orchestration. Asset keys and dimensions are
 * intentionally preserved from the previous implementation because other files
 * still refer to these keys directly.
 */
export const AssetLoader =
{
    preload : function()
    {
        this.loadMapAndTilesets();
        this.loadPlayerSprites();
        this.loadMonsterSprites();
        this.loadEffectSprites();
        this.loadHudAndScreenSprites();
        this.loadAnimatedTileSprites();
        this.loadFonts();
    },

    loadMapAndTilesets : function()
    {
        // Load the map and its tilesets.
        game.load.tilemap('map', 'assets/maps/son-of-blagger.json', null, Phaser.Tilemap.TILED_JSON);
        game.load.image('background', 'assets/tileset/background.png');
        game.load.image('monsters', 'assets/tileset/monsters.png');
    },

    loadPlayerSprites : function()
    {
        game.load.spritesheet('blagger', 'assets/sprites/blagger.png', 48, 42);
        game.load.spritesheet('blaggerWhite', 'assets/sprites/blagger white.png', 48, 42);
        game.load.spritesheet('blaggerDying', 'assets/sprites/blagger dying.png', 36, 42);
        game.load.spritesheet('blaggerDyingWhite', 'assets/sprites/blagger dying white.png', 36, 42);
    },

    loadMonsterSprites : function()
    {
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
    },

    loadEffectSprites : function()
    {
        game.load.spritesheet('explosion', 'assets/sprites/explosion.png', 48, 42);
        game.load.spritesheet('reverseExplosion', 'assets/sprites/reverse explosion.png', 48, 42);
    },

    loadHudAndScreenSprites : function()
    {
        game.load.spritesheet('bonusMan', 'assets/sprites/bonus man.png', 112, 14);
        game.load.spritesheet('title', 'assets/sprites/title.png', 272, 82);
        game.load.spritesheet('game over', 'assets/sprites/game over.png', 360, 90);
        game.load.spritesheet('end level', 'assets/sprites/end level.png', 16, 16);
    },

    loadAnimatedTileSprites : function()
    {
        game.load.spritesheet('conveyorRight', 'assets/sprites/conveyor right.png', 16, 16);
        game.load.spritesheet('conveyorLeft', 'assets/sprites/conveyor left.png', 16, 16);
        game.load.spritesheet('ladderLeft', 'assets/sprites/ladder left.png', 16, 16);
        game.load.spritesheet('ladderRight', 'assets/sprites/ladder right.png', 16, 16);
        game.load.spritesheet('waveLeft', 'assets/sprites/wave left.png', 16, 16);
        game.load.spritesheet('waveRight', 'assets/sprites/wave right.png', 16, 16);
        game.load.spritesheet('vanishingPlatform', 'assets/sprites/vanishing platform.png', 16, 16);
    },

    loadFonts : function()
    {
        game.load.image('blaggerFont', 'assets/tileset/fonts.png');
    }
};
