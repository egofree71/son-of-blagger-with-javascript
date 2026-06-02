/**
 * Loads Phaser objects that belong to the current Tiled level.
 *
 * Level keeps the runtime state of the current level, but the details of
 * reading Tiled object layers and creating Phaser sprites are isolated here.
 * This keeps Level.load() focused on orchestration instead of low-level map
 * parsing and sprite creation.
 */
window.LevelObjectLoader =
{
    /**
     * Creates all monster instances for the requested level.
     *
     * Existing monster sprites are destroyed first. This preserves the previous
     * restart behaviour while keeping the cleanup close to the object creation
     * logic.
     */
    loadMonsters : function(levelNumber, previousMonsters, monstersGroup)
    {
        this.destroyMonsterSprites(previousMonsters);

        var monsterObjects = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, levelNumber, LevelConstants.OBJECT_LAYER_MONSTERS);
        var monsters = [];

        for (var i = 0; i < monsterObjects.length; i++)
        {
            var monsterProperties = monsterObjects[i];
            var tileProperties = Util.getMonstersTileProperties(monsterProperties.type);
            var monster = new Monster(monsterProperties, tileProperties);

            monstersGroup.add(monster.sprite);
            monsters.push(monster);
        }

        this.hideMonsterSprites(monsters);

        return monsters;
    },

    /**
     * Destroys all monster sprites from the previous load of this level.
     */
    destroyMonsterSprites : function(monsters)
    {
        for (var i = 0; i < monsters.length; i++)
            monsters[i].sprite.destroy();
    },

    /**
     * Hides newly created monster sprites until the reveal animation finishes.
     */
    hideMonsterSprites : function(monsters)
    {
        for (var i = 0; i < monsters.length; i++)
            monsters[i].sprite.visible = false;
    },

    /**
     * Creates or repositions the invisible end-level sprite.
     *
     * The Tiled object uses map coordinates. The small Y offset is kept from the
     * original implementation so the collision box still matches the old game.
     */
    loadEndLevel : function(levelNumber, currentEndLevel)
    {
        var endLevelObject = this.findSingleObject(LevelConstants.OBJECT_LAYER_END_LEVEL, levelNumber);
        var x = endLevelObject.x;
        var y = endLevelObject.y - LevelConstants.END_LEVEL_Y_OFFSET;

        if (!currentEndLevel)
        {
            var endLevel = game.add.sprite(x, y, LevelConstants.SPRITE_END_LEVEL);
            endLevel.alpha = 0;
            return endLevel;
        }

        currentEndLevel.reset(x, y);
        return currentEndLevel;
    },

    /**
     * Finds the first object for the requested level in a Tiled object layer.
     *
     * Current map data is expected to contain the object. The explicit error is
     * only here to make broken map data easier to diagnose during future edits.
     */
    findSingleObject : function(layerName, levelNumber)
    {
        var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, levelNumber, layerName);

        if (results.length == 0)
            throw new Error("No Tiled object found in layer '" + layerName + "' for level " + levelNumber + ".");

        return results[0];
    }
};
