import type { Scene, Tilemaps } from "phaser";
import { Data } from "../data/gameData";
import type { PlayerProbeRectangle } from "./Player";
import { Monster } from "./Monster";
import type { MonsterTileProperties } from "./Monster";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import { getTiledProperty } from "../tiled/tiledObjects";

interface TiledMonsterObject extends TiledObjectLike
{
    type?: string;
}

export interface MonsterSpawnPoint
{
    x: number;
    y: number;
}

/**
 * Loads and updates the monsters for one level.
 *
 * The manager reads monster objects from the Tiled map, creates the corresponding
 * sprites, advances their predefined paths and exposes the collision query used
 * by GameScene.
 */
export class MonsterManager
{
    private static readonly OBJECT_LAYER_NAME = "monsters";
    private static readonly TILESET_NAME = "monsters";

    // Pace animation changes separately from movement so monsters do not flicker
    // too quickly on high-refresh displays.
    private static readonly ANIMATION_FRAME_INTERVAL = 2;

    private readonly monsters: Monster[];
    private readonly animationCounterMax: number;
    private animationCounter: number;
    private animationFrameAccumulator = 1;

    /**
     * @param scene Gameplay scene that owns the monster sprites.
     * @param map Tiled map containing the `monsters` object layer and tileset metadata.
     * @param levelNumber Level whose monsters should be loaded.
     */
    constructor(scene: Scene, map: Tilemaps.Tilemap, levelNumber: number)
    {
        this.monsters = this.loadMonsters(scene, map, levelNumber);
        this.animationCounterMax = this.readAnimationCounterMax(levelNumber);
        this.animationCounter = this.animationCounterMax;
    }

    /**
     * Moves all active monsters and advances their animation when needed.
     */
    update(): void
    {
        const canAdvanceAnimationThisFrame = this.shouldProcessAnimationThisFrame();

        for (const monster of this.monsters) {
            // The shared counter is consumed per monster, which keeps identical
            // monsters from looking perfectly synchronized.
            const advanceAnimation = canAdvanceAnimationThisFrame && this.shouldAdvanceMonsterAnimation();
            monster.update(advanceAnimation);
        }
    }

    /**
     * Resets all monsters to their original Tiled positions.
     */
    reset(): void
    {
        this.animationCounter = this.animationCounterMax;
        this.animationFrameAccumulator = 1;

        for (const monster of this.monsters) {
            monster.reset();
        }
    }

    /**
     * Resets, hides and disables monsters before their spawn explosions.
     */
    prepareForSpawnReveal(): void
    {
        this.animationCounter = this.animationCounterMax;
        this.animationFrameAccumulator = 1;

        for (const monster of this.monsters) {
            monster.prepareForSpawnReveal();
        }
    }

    /**
     * Makes all monsters visible and active after the reveal has finished.
     */
    activateAfterSpawnReveal(): void
    {
        for (const monster of this.monsters) {
            monster.activateAfterSpawnReveal();
        }
    }

    /**
     * Returns the positions used by the spawn explosion sequence.
     */
    getSpawnPoints(): MonsterSpawnPoint[]
    {
        return this.monsters.map((monster) => monster.getSpawnPosition());
    }

    /**
     * Returns current positions for the end-of-level reverse explosion effect.
     */
    getCurrentPositions(): MonsterSpawnPoint[]
    {
        return this.monsters.map((monster) => monster.getCurrentPosition());
    }

    /**
     * Hides and disables all monsters from the completed level.
     */
    hideForLevelTransition(): void
    {
        for (const monster of this.monsters) {
            monster.hideForLevelTransition();
        }
    }

    /**
     * Destroys old level monsters before GameScene creates the next set.
     */
    destroy(): void
    {
        for (const monster of this.monsters) {
            monster.destroy();
        }
    }

    /**
     * Checks whether the player's body probe touches any active monster.
     */
    touchesPlayer(playerBounds: PlayerProbeRectangle): boolean
    {
        return this.monsters.some((monster) => monster.touchesPlayer(playerBounds));
    }

    /**
     * Exposes the number of loaded monsters for debug/status output.
     */
    get count(): number
    {
        return this.monsters.length;
    }

    private loadMonsters(scene: Scene, map: Tilemaps.Tilemap, levelNumber: number): Monster[]
    {
        const objectLayer = map.getObjectLayer(MonsterManager.OBJECT_LAYER_NAME);

        if (!objectLayer) {
            throw new Error("Could not find the Tiled 'monsters' object layer.");
        }

        return (objectLayer.objects as TiledMonsterObject[])
            .filter((object) => String(getTiledProperty(object, "level")) === String(levelNumber))
            .map((object) => {
                const type = this.requireMonsterType(object);
                const tileProperties = this.requireTileProperties(map, type);
                return new Monster(scene, object, tileProperties);
            });
    }

    private requireTileProperties(map: Tilemaps.Tilemap, monsterType: string): MonsterTileProperties
    {
        const monsterTileset = map.tilesets.find((tileset) => tileset.name === MonsterManager.TILESET_NAME);

        if (!monsterTileset) {
            throw new Error("Could not find the Tiled 'monsters' tileset.");
        }

        const rawTileset = monsterTileset as unknown as {
            tileProperties?: Record<string, MonsterTileProperties>;
            tileproperties?: Record<string, MonsterTileProperties>;
        };
        const tileProperties = rawTileset.tileProperties ?? rawTileset.tileproperties ?? {};

        // The map stores collision metadata by tile id, while monster objects use
        // their textual type. Keep that lookup here so Monster only receives the
        // properties it needs at runtime.
        for (const properties of Object.values(tileProperties)) {
            if (properties.type === monsterType) {
                return properties;
            }
        }

        throw new Error(`No monster tile properties found for type '${monsterType}'.`);
    }

    private requireMonsterType(monsterObject: TiledMonsterObject): string
    {
        if (!monsterObject.type) {
            throw new Error("Monster object is missing its Tiled type.");
        }

        return monsterObject.type;
    }

    private readAnimationCounterMax(levelNumber: number): number
    {
        const levelDefinition = Data.levels[levelNumber - 1];

        return levelDefinition?.[1] ?? 1;
    }

    private shouldProcessAnimationThisFrame(): boolean
    {
        this.animationFrameAccumulator += 1 / MonsterManager.ANIMATION_FRAME_INTERVAL;

        if (this.animationFrameAccumulator < 1) {
            return false;
        }

        this.animationFrameAccumulator -= 1;
        return true;
    }

    private shouldAdvanceMonsterAnimation(): boolean
    {
        this.animationCounter -= 1;

        if (this.animationCounter !== 0) {
            return false;
        }

        this.animationCounter = this.animationCounterMax;
        return true;
    }
}
