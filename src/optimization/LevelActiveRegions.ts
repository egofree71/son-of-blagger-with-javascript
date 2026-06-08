/**
 * Pixel rectangles describing the portion of the full map that belongs to each
 * playable level.
 *
 * The values are ported from the old GameMaker active-region scripts. They are
 * deliberately used as a rendering/update optimisation only: the Tiled map
 * stays loaded as one continuous world, but animated decorations outside the
 * current level no longer receive frame updates on slower devices.
 */
export interface ActiveRegion
{
    x: number;
    y: number;
    width: number;
    height: number;
}

const LEVEL_ACTIVE_REGIONS: Readonly<Record<number, readonly ActiveRegion[]>> = {
    1: [
        { x: 546, y: 96, width: 1246, height: 556 }
    ],
    2: [
        { x: 802, y: 288, width: 990, height: 604 }
    ],
    3: [
        { x: 546, y: 384, width: 942, height: 508 }
    ],
    4: [
        { x: 818, y: 512, width: 1566, height: 460 }
    ],
    5: [
        { x: 1762, y: 448, width: 1278, height: 524 }
    ],
    6: [
        { x: 1762, y: 208, width: 1278, height: 476 }
    ],
    7: [
        { x: 1890, y: 64, width: 1294, height: 412 }
    ],
    8: [
        { x: 2562, y: 16, width: 766, height: 476 },
        { x: 2434, y: 320, width: 894, height: 780 },
        { x: 1858, y: 698, width: 1216, height: 402 },
        { x: 1186, y: 758, width: 1306, height: 342 }
    ],
    9: [
        { x: 818, y: 742, width: 990, height: 358 },
        { x: 2, y: 662, width: 1422, height: 438 },
        { x: 2, y: 282, width: 1150, height: 450 }
    ],
    10: [
        { x: 0, y: 96, width: 1216, height: 540 }
    ],
    11: [
        { x: 0, y: 0, width: 640, height: 684 },
        { x: 0, y: 496, width: 640, height: 380 },
        { x: 0, y: 698, width: 784, height: 402 },
        { x: 0, y: 0, width: 1792, height: 252 }
    ],
    12: [
        { x: 1170, y: 32, width: 1198, height: 652 },
        { x: 1856, y: 0, width: 832, height: 428 }
    ]
};

/**
 * Returns the active regions for a level. An unknown level returns an empty
 * array, which callers treat as “no culling” to keep debug experiments safe.
 */
export function getLevelActiveRegions(levelNumber: number): readonly ActiveRegion[]
{
    return LEVEL_ACTIVE_REGIONS[levelNumber] ?? [];
}

/**
 * Tests whether a world-space rectangle overlaps any active region.
 *
 * Empty regions intentionally mean “active everywhere”, mirroring the fallback
 * in the original GameMaker script when no regions were specified.
 */
export function overlapsActiveRegions(
    x: number,
    y: number,
    width: number,
    height: number,
    activeRegions: readonly ActiveRegion[]
): boolean
{
    if (activeRegions.length === 0) {
        return true;
    }

    const right = x + width;
    const bottom = y + height;

    return activeRegions.some((region) => {
        const regionRight = region.x + region.width;
        const regionBottom = region.y + region.height;

        return x < regionRight &&
            right > region.x &&
            y < regionBottom &&
            bottom > region.y;
    });
}
