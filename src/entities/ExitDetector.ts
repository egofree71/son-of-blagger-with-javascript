import type { PlayerProbeRectangle } from "./Player";
import type { TiledObjectLike } from "../tiled/tiledObjects";

/**
 * Detects whether the player has reached the current level exit.
 *
 * The exit is still an invisible Tiled object in the Phaser 4 prototype. This
 * helper keeps the same rectangle convention as the Phaser 2 LevelObjectLoader:
 * the object position is shifted upward by 16 pixels before collision checks.
 * GameScene decides whether all keys have been collected before using the hit.
 */
export class ExitDetector
{
    private static readonly END_LEVEL_Y_OFFSET = 16;

    private readonly x: number;
    private readonly y: number;
    private readonly width: number;
    private readonly height: number;

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

        // Keep the rectangle test explicit instead of importing Arcade Physics.
        // The Phaser 2 reference used simple rectangle intersection here.
        return playerLeft < exitRight &&
            playerRight > this.x &&
            playerTop < exitBottom &&
            playerBottom > this.y;
    }
}
