import type { PlayerProbeRectangle } from "./Player";
import type { TiledObjectLike } from "../tiled/tiledObjects";

/**
 * Detects whether the player has reached the current level exit.
 *
 * The exit is an invisible Tiled object. Its collision rectangle is shifted
 * upward by 16 pixels to match the map convention used by the level data.
 * GameScene decides whether all keys have been collected before accepting the hit.
 */
export class ExitDetector
{
    private static readonly END_LEVEL_Y_OFFSET = 16;

    private readonly x: number;
    private readonly y: number;
    private readonly width: number;
    private readonly height: number;

    /**
     * @param exitObject Tiled object that defines the level exit area.
     */
    constructor(exitObject: TiledObjectLike)
    {
        this.x = exitObject.x;
        this.y = exitObject.y - ExitDetector.END_LEVEL_Y_OFFSET;
        this.width = exitObject.width ?? 16;
        this.height = exitObject.height ?? 16;
    }

    /**
     * Returns true when the supplied player rectangle intersects the exit.
     */
    touchesPlayer(bounds: PlayerProbeRectangle): boolean
    {
        const playerLeft = Math.min(bounds.xStart, bounds.xEnd);
        const playerRight = Math.max(bounds.xStart, bounds.xEnd);
        const playerTop = Math.min(bounds.yStart, bounds.yEnd);
        const playerBottom = Math.max(bounds.yStart, bounds.yEnd);
        const exitRight = this.x + this.width;
        const exitBottom = this.y + this.height;

        // Keep the rectangle test explicit. The exit is only a trigger area, so
        // Arcade Physics would add unnecessary bodies and lifecycle concerns.
        return playerLeft < exitRight &&
            playerRight > this.x &&
            playerTop < exitBottom &&
            playerBottom > this.y;
    }
}
