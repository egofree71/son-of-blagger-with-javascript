import type { Tilemaps } from "phaser";

/**
 * Minimal shape used for objects read from Tiled object layers.
 *
 * Phaser exposes object-layer entries with a loose runtime structure, and the
 * current map stores custom properties in object-shaped or array-shaped data.
 * This type keeps scene and entity code away from broad `any` values.
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
 * The map uses this convention to find player starts, level exits and monsters.
 * Keeping the lookup here lets the map remain the source of truth for level
 * placement data.
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
