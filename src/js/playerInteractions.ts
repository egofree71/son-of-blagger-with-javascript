import { LevelConstants } from "./levelConstants.ts";
import { CollisionDetector } from "./collisionDetector.ts";
import type { PlayerController } from "./player.ts";

export interface PlayerInteractionResult
{
    keyCollected: boolean;
    playerKilled: boolean;
    exitReached: boolean;
}

/**
 * Level-owned operations needed by player interactions.
 *
 * PlayerInteractions only needs to know that these operations exist; it does
 * not import LevelController directly. GameController passes the current level
 * instance through Player.update(), which keeps the dependency direction
 * explicit and avoids a Player -> PlayerInteractions -> Level cycle.
 */
export interface PlayerInteractionContext
{
    collectKey(): void;
    hasCollectedAllKeys(): boolean;
    collidesWithMonsterArea(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean;
    collidesWithExitArea(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean;
}

/**
 * Handles gameplay interactions that are triggered by the player's position.
 *
 * Player.update() still owns movement, jumping, falling, and animation. Once the
 * movement intent has been applied, it delegates key collection, deadly
 * collisions, and exit detection to this object.
 *
 * PlayerInteractions detects what happened and performs the level-local mutation
 * that belongs to the collision itself, such as collecting a key tile. It does
 * not import Level, update the HUD, or decide the global game state anymore.
 * GameController provides the needed level operations and consumes the returned
 * result to own score/HUD/state flow.
 *
 * The x/y values passed by Player.update() are intentionally the coordinates
 * captured at the beginning of the frame. This preserves the timing of the old
 * implementation, which performed the interaction checks with those same values
 * after applying the one-pixel movement.
 */
export class PlayerInteractionsController
{
    // Collision rectangle offsets used when collecting keys.
    private readonly KEY_LEFT_OFFSET = 7;
    private readonly KEY_RIGHT_OFFSET = 23;
    private readonly KEY_TOP_OFFSET = 0;
    private readonly KEY_BOTTOM_OFFSET = 0;

    // Collision rectangle offsets used for deadly tile checks.
    private readonly DEADLY_LEFT_OFFSET = 5;
    private readonly DEADLY_RIGHT_OFFSET = 27;
    private readonly DEADLY_TOP_OFFSET = 0;
    private readonly DEADLY_BOTTOM_OFFSET = -1;

    // Collision rectangle offsets used for monster and exit checks.
    private readonly BODY_LEFT_OFFSET = 4;
    private readonly BODY_RIGHT_OFFSET = 28;
    private readonly BODY_TOP_OFFSET = 0;
    private readonly BODY_BOTTOM_OFFSET = 0;

    /**
     * Runs all non-movement interactions for the player.
     */
    public update(player: PlayerController, x: number, y: number, context: PlayerInteractionContext): PlayerInteractionResult
    {
        return {
            keyCollected: this.collectKeyIfNeeded(player, x, y, context),
            playerKilled: this.killPlayerIfNeeded(player, x, y, context),
            exitReached: this.exitLevelIfNeeded(player, x, y, context)
        };
    }

    /**
     * Collects a key tile if the player's key collision box touches one.
     */
    private collectKeyIfNeeded(player: PlayerController, x: number, y: number, context: PlayerInteractionContext): boolean
    {
        const playerHeight: number = player.getBodyHeight();

        if (!CollisionDetector.collisionRectangle(
            x + this.KEY_LEFT_OFFSET,
            y + this.KEY_TOP_OFFSET,
            x + this.KEY_RIGHT_OFFSET,
            y + playerHeight + this.KEY_BOTTOM_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_KEY))
        {
            return false;
        }

        context.collectKey();

        // Hide the key tile and force the tilemap layer to redraw.
        CollisionDetector.lastTileHit.alpha = 0;
        layer.dirty = true;

        return true;
    }

    /**
     * Reports whether the current collision box touches a deadly tile or a monster.
     */
    private killPlayerIfNeeded(player: PlayerController, x: number, y: number, context: PlayerInteractionContext): boolean
    {
        const playerHeight: number = player.getBodyHeight();

        return CollisionDetector.collisionRectangle(
                x + this.DEADLY_LEFT_OFFSET,
                y + this.DEADLY_TOP_OFFSET,
                x + this.DEADLY_RIGHT_OFFSET,
                y + playerHeight + this.DEADLY_BOTTOM_OFFSET,
                LevelConstants.TILED_PROPERTY_TYPE,
                LevelConstants.TILE_TYPE_DEADLY) ||
            context.collidesWithMonsterArea(
                x + this.BODY_LEFT_OFFSET,
                y + this.BODY_TOP_OFFSET,
                x + this.BODY_RIGHT_OFFSET,
                y + playerHeight + this.BODY_BOTTOM_OFFSET);
    }

    /**
     * Reports that the player touched the level exit after collecting all keys.
     */
    private exitLevelIfNeeded(player: PlayerController, x: number, y: number, context: PlayerInteractionContext): boolean
    {
        const playerHeight: number = player.getBodyHeight();

        return context.hasCollectedAllKeys() &&
            context.collidesWithExitArea(
                x + this.BODY_LEFT_OFFSET,
                y + this.BODY_TOP_OFFSET,
                x + this.BODY_RIGHT_OFFSET,
                y + playerHeight + this.BODY_BOTTOM_OFFSET);
    }
}

