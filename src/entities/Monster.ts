import type { GameObjects, Scene } from "phaser";
import type { PlayerProbeRectangle } from "./Player";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import { getTiledProperty } from "../tiled/tiledObjects";

export type MonsterDirection = "left" | "right" | "up" | "down";

export interface MonsterTileProperties
{
    type: string;
    width: string | number;
    height: string | number;
    offsetX: string | number;
    offsetY: string | number;
}

interface TiledMonsterObject extends TiledObjectLike
{
    type?: string;
}

/**
 * Runtime monster entity.
 *
 * Each monster follows a fixed horizontal or vertical path read from its Tiled
 * object properties. Its collision rectangle comes from the monster tileset
 * metadata, not from the full sprite frame, so visual padding does not make the
 * monster unfairly dangerous.
 */
export class Monster
{
    private static readonly TILED_Y_OFFSET = 42;
    private static readonly DEFAULT_SPEED = 0.5;
    private static readonly ANIMATION_FRAMES: readonly number[] = [0, 1];
    private static readonly SPRITE_DEPTH = 9;

    // Monsters move by half-pixel steps, but not on every logical tick. The interval
    // keeps their apparent speed close to Sid's current movement speed.
    private static readonly MOVEMENT_TICK_INTERVAL = 2;

    private readonly sprite: GameObjects.Sprite;
    private readonly firstPositionX: number;
    private readonly firstPositionY: number;
    private readonly initialDirection: MonsterDirection;
    private readonly maxDistance: number;
    private readonly realWidth: number;
    private readonly realHeight: number;
    private readonly collisionOffsetX: number;
    private readonly collisionOffsetY: number;

    private direction: MonsterDirection;
    private distanceFromOrigin = 0;
    private animationFrameIndex = 0;
    private movementAccumulator = 1;
    private active = true;

    /**
     * @param scene Gameplay scene that owns the monster sprite.
     * @param monsterObject Tiled object containing position, type and movement data.
     * @param tileProperties Tileset metadata describing the real collision box.
     */
    constructor(scene: Scene, monsterObject: TiledMonsterObject, tileProperties: MonsterTileProperties)
    {
        const textureKey = this.requireMonsterType(monsterObject);

        this.firstPositionX = monsterObject.x;
        this.firstPositionY = monsterObject.y - Monster.TILED_Y_OFFSET;
        this.initialDirection = this.readDirection(monsterObject);
        this.direction = this.initialDirection;
        this.maxDistance = this.readNumber(getTiledProperty(monsterObject, "maxDistance"));
        this.realWidth = this.readNumber(tileProperties.width);
        this.realHeight = this.readNumber(tileProperties.height);
        this.collisionOffsetX = this.readNumber(tileProperties.offsetX);
        this.collisionOffsetY = this.readNumber(tileProperties.offsetY);

        this.sprite = scene.add.sprite(this.firstPositionX, this.firstPositionY, textureKey, Monster.ANIMATION_FRAMES[0])
            .setOrigin(0, 0)
            .setDepth(Monster.SPRITE_DEPTH);
    }

    /**
     * Moves the monster for one gameplay frame.
     */
    update(advanceAnimation: boolean): void
    {
        if (!this.active) {
            return;
        }

        if (advanceAnimation) {
            this.advanceAnimationFrame();
        }

        if (!this.shouldMoveThisTick()) {
            return;
        }

        const movement = this.resolveMovementForFrame();
        this.sprite.x += movement.x;
        this.sprite.y += movement.y;
    }

    /**
     * Restores the original Tiled position after a level reset.
     */
    reset(): void
    {
        this.sprite.setPosition(this.firstPositionX, this.firstPositionY);
        this.direction = this.initialDirection;
        this.distanceFromOrigin = 0;
        this.animationFrameIndex = 0;
        this.movementAccumulator = 1;
        this.sprite.setFrame(Monster.ANIMATION_FRAMES[0]);
        this.sprite.setVisible(this.active);
    }

    /**
     * Hides the monster and disables movement/collision during the reveal effect.
     */
    prepareForSpawnReveal(): void
    {
        this.active = false;
        this.reset();
        this.sprite.setVisible(false);
    }

    /**
     * Makes the monster visible and dangerous after the reveal effect completes.
     */
    activateAfterSpawnReveal(): void
    {
        this.active = true;
        this.sprite.setVisible(true);
    }

    /**
     * Returns the map position where the spawn explosion should be shown.
     */
    getSpawnPosition(): { x: number; y: number }
    {
        return {
            x: this.firstPositionX,
            y: this.firstPositionY
        };
    }

    /**
     * Returns the current top-left sprite position for reverse explosions.
     */
    getCurrentPosition(): { x: number; y: number }
    {
        return {
            x: this.sprite.x,
            y: this.sprite.y
        };
    }

    /**
     * Hides and disables the monster after the completed-level flash.
     */
    hideForLevelTransition(): void
    {
        this.active = false;
        this.sprite.setVisible(false);
    }

    /**
     * Destroys the Phaser sprite when the next level replaces its monsters.
     */
    destroy(): void
    {
        this.sprite.destroy();
    }

    /**
     * Tests the monster's real hitbox against the player's body probe.
     */
    touchesPlayer(playerBounds: PlayerProbeRectangle): boolean
    {
        if (!this.active) {
            return false;
        }

        const monsterLeft = this.sprite.x + this.collisionOffsetX;
        const monsterTop = this.sprite.y + this.collisionOffsetY;
        const monsterRight = monsterLeft + this.realWidth;
        const monsterBottom = monsterTop + this.realHeight;

        return playerBounds.xStart < monsterRight &&
            playerBounds.xEnd > monsterLeft &&
            playerBounds.yStart < monsterBottom &&
            playerBounds.yEnd > monsterTop;
    }

    private resolveMovementForFrame(): { x: number; y: number }
    {
        let horizontalSpeed = 0;
        let verticalSpeed = 0;

        switch (this.direction) {
            case "right":
                if (this.distanceFromOrigin <= this.maxDistance) {
                    this.distanceFromOrigin += Monster.DEFAULT_SPEED;
                    horizontalSpeed = Monster.DEFAULT_SPEED;
                }
                else {
                    this.direction = "left";
                }
                break;

            case "left":
                if (this.distanceFromOrigin >= 0) {
                    this.distanceFromOrigin -= Monster.DEFAULT_SPEED;
                    horizontalSpeed = -Monster.DEFAULT_SPEED;
                }
                else {
                    this.direction = "right";
                }
                break;

            case "down":
                if (this.distanceFromOrigin <= this.maxDistance) {
                    this.distanceFromOrigin += Monster.DEFAULT_SPEED;
                    verticalSpeed = Monster.DEFAULT_SPEED;
                }
                else {
                    this.direction = "up";
                }
                break;

            case "up":
                if (this.distanceFromOrigin >= 0) {
                    this.distanceFromOrigin -= Monster.DEFAULT_SPEED;
                    verticalSpeed = -Monster.DEFAULT_SPEED;
                }
                else {
                    this.direction = "down";
                }
                break;
        }

        return { x: horizontalSpeed, y: verticalSpeed };
    }

    private shouldMoveThisTick(): boolean
    {
        // Accumulate fractional movement permission so the monster can keep its
        // tiny 0.5px step without moving on every logical tick.
        this.movementAccumulator += 1 / Monster.MOVEMENT_TICK_INTERVAL;

        if (this.movementAccumulator < 1) {
            return false;
        }

        this.movementAccumulator -= 1;
        return true;
    }

    private advanceAnimationFrame(): void
    {
        this.animationFrameIndex = (this.animationFrameIndex + 1) % Monster.ANIMATION_FRAMES.length;
        this.sprite.setFrame(Monster.ANIMATION_FRAMES[this.animationFrameIndex]);
    }

    private requireMonsterType(monsterObject: TiledMonsterObject): string
    {
        if (!monsterObject.type) {
            throw new Error("Monster object is missing its Tiled type.");
        }

        return monsterObject.type;
    }

    private readDirection(monsterObject: TiledMonsterObject): MonsterDirection
    {
        const direction = String(getTiledProperty(monsterObject, "direction"));

        if (direction === "left" || direction === "right" || direction === "up" || direction === "down") {
            return direction;
        }

        throw new Error(`Unsupported monster direction '${direction}'.`);
    }

    private readNumber(value: string | number | unknown): number
    {
        return Number.parseInt(String(value), 10);
    }
}
