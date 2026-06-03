import { LevelConstants, type TiledObjectLayerName } from "./levelConstants.ts";
import { Util, type MonsterTileProperties, type TiledObject } from "./util.ts";
import { Monster } from "./monster.ts";

interface TiledMonsterObject extends TiledObject {
    type: string;
}

function ensureMonsterObject(object: TiledObject): TiledMonsterObject
{
    if (!object.type)
        throw new Error("Monster object is missing its Tiled type.");

    return object as TiledMonsterObject;
}

function ensureMonsterTileProperties(type: string, tileProperties: MonsterTileProperties | undefined): MonsterTileProperties
{
    if (!tileProperties)
        throw new Error("No monster tile properties found for type '" + type + "'.");

    return tileProperties;
}

/**
 * Loads Phaser objects that belong to the current Tiled level.
 *
 * Level keeps the runtime state of the current level, but the details of
 * reading Tiled object layers and creating Phaser sprites are isolated here.
 * This keeps Level.load() focused on orchestration instead of low-level map
 * parsing and sprite creation.
 */
export const LevelObjectLoader =
{
    /**
     * Creates all monster instances for the requested level.
     *
     * Existing monster sprites are destroyed first. This preserves the previous
     * restart behaviour while keeping the cleanup close to the object creation
     * logic.
     */
    loadMonsters : function(levelNumber: number, previousMonsters: Monster[], monstersGroup: any): Monster[]
    {
        this.destroyMonsterSprites(previousMonsters);

        var monsterObjects = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, levelNumber, LevelConstants.OBJECT_LAYER_MONSTERS);
        var monsters: Monster[] = [];

        for (var i = 0; i < monsterObjects.length; i++)
        {
            var monsterProperties = ensureMonsterObject(monsterObjects[i]);
            var tileProperties = ensureMonsterTileProperties(monsterProperties.type, Util.getMonstersTileProperties(monsterProperties.type));
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
    destroyMonsterSprites : function(monsters: Monster[]): void
    {
        for (var i = 0; i < monsters.length; i++)
            monsters[i].sprite.destroy();
    },

    /**
     * Hides newly created monster sprites until the reveal animation finishes.
     */
    hideMonsterSprites : function(monsters: Monster[]): void
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
    loadEndLevel : function(levelNumber: number, currentEndLevel: any): any
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
    findSingleObject : function(layerName: TiledObjectLayerName, levelNumber: number): TiledObject
    {
        var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, levelNumber, layerName);

        if (results.length == 0)
            throw new Error("No Tiled object found in layer '" + layerName + "' for level " + levelNumber + ".");

        return results[0];
    }
};
