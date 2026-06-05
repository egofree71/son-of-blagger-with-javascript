import type { Tilemaps } from "phaser";

/**
 * Minimal shape used by the Phaser 4 prototype for objects read from Tiled.
 *
 * Phaser 4 exposes Tiled object-layer entries with a loose runtime structure,
 * while the current map still stores custom properties in the older object-like
 * JSON format. This small type keeps GameScene and early prototype entities from
 * depending on broad `any` values while the real map conventions are inspected.
 */
export interface TiledObjectLike
{
    x: number;
    y: number;
    width?: number;
    height?: number;
    name?: string;
    properties?: Record<string, unknown> | Array<{ name: string; value: unknown }>;
}

/**
 * Finds the first object in a Tiled object layer whose `level` property matches
 * the requested level number.
 *
 * The current Phaser 2 code uses this convention to find the player start, the
 * level exit and monsters. The Phaser 4 prototype keeps the convention intact so
 * the map can remain the source of truth during the port.
 */
export function findObjectByLevel(map: Tilemaps.Tilemap, layerName: string, levelNumber: number): TiledObjectLike | undefined
{
    const objectLayer = map.getObjectLayer(layerName);

    if (!objectLayer) {
        return undefined;
    }

    return (objectLayer.objects as TiledObjectLike[]).find((object) => {
        return String(getTiledProperty(object, "level")) === String(levelNumber);
    });
}

/**
 * Reads a custom property from a Tiled object.
 *
 * The helper accepts both the old object-shaped property data used by the
 * existing map and the array-shaped property data that Phaser can expose with
 * newer Tiled exports. Keeping this tolerance here avoids scattering Tiled JSON
 * format checks through scene and entity code.
 */
export function getTiledProperty(object: TiledObjectLike, propertyName: string): unknown
{
    const properties = object.properties;

    if (!properties) {
        return undefined;
    }

    if (Array.isArray(properties)) {
        return properties.find((property) => property.name === propertyName)?.value;
    }

    return properties[propertyName];
}
