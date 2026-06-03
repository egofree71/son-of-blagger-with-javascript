import { GameStates } from "./gameStates.ts";
import { MonsterConstants, type MonsterDirection } from "./monsterConstants.ts";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";
import type { MonsterTileProperties, TiledObject } from "./util.ts";

interface TiledMonsterObject extends TiledObject {
    type: string;
    properties: Record<string, any>;
}

function parseMapNumber(value: string | number | undefined): number
{
    return parseInt(String(value), 10);
}

// Monster object
export class Monster
{
    firstPositionX: number;
    firstPositionY: number;
    distanceFromOrigin: number;

    monsterSpeed: number;
    realWidth: number;
    realHeight: number;
    collisionOffsetX: number;
    collisionOffsetY: number;

    direction: MonsterDirection;
    level: number;
    maxDistance: number;
    sprite: any;

    constructor(monsterProperties: TiledMonsterObject, tileProperties: MonsterTileProperties)
    {
        this.firstPositionX = monsterProperties.x;
        this.firstPositionY = monsterProperties.y - MonsterConstants.TILED_TO_PHASER_Y_OFFSET;
        this.distanceFromOrigin = 0;

        this.monsterSpeed = MonsterConstants.DEFAULT_SPEED;
        // Add the bounding box for the collision
        this.realWidth = parseMapNumber(tileProperties.width);
        this.realHeight = parseMapNumber(tileProperties.height);
        this.collisionOffsetX = parseMapNumber(tileProperties.offsetX);
        this.collisionOffsetY = parseMapNumber(tileProperties.offsetY);

        this.direction = monsterProperties.properties[MonsterConstants.PROPERTY_DIRECTION] as MonsterDirection;
        this.level = parseMapNumber(monsterProperties.properties[MonsterConstants.PROPERTY_LEVEL]);
        this.maxDistance = parseMapNumber(monsterProperties.properties[MonsterConstants.PROPERTY_MAX_DISTANCE]);

        // Create a new sprite for the current monster
        // Phaser uses top-left coordinates while Tiled stores this object lower on the vertical axis.
        this.sprite = game.add.sprite(monsterProperties.x, monsterProperties.y - MonsterConstants.TILED_TO_PHASER_Y_OFFSET, monsterProperties.type);
        game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
        this.sprite.animations.add(MonsterConstants.ANIMATION_DEFAULT, MonsterConstants.ANIMATION_FRAMES, MonsterConstants.ANIMATION_FRAME_RATE, true);
    }

    updatePosition(): void
    {
        if (GameController.gameState != GameStates.PLAYING) return ;

        // If the shared monster animation counter is empty, update the monster's position.
        if (Level.shouldAdvanceMonsterAnimation())
            this.sprite.animations.next();

        var horizontalSpeed = 0;
        var verticalSpeed = 0;

        switch (this.direction)
        {
            case MonsterConstants.DIRECTION_RIGHT :

                // If we haven't reached the maximum distance, continue
                if (this.distanceFromOrigin <= this.maxDistance)
                {
                    this.distanceFromOrigin += this.monsterSpeed;
                    horizontalSpeed = this.monsterSpeed;
                }
                else
                {
                    this.direction = MonsterConstants.DIRECTION_LEFT;
                }

                break;

            case MonsterConstants.DIRECTION_LEFT :

                if (this.distanceFromOrigin >= 0)
                {
                    this.distanceFromOrigin -= this.monsterSpeed;
                    horizontalSpeed = -this.monsterSpeed;
                }
                else
                {
                    this.direction = MonsterConstants.DIRECTION_RIGHT;
                }

                break;

            case MonsterConstants.DIRECTION_DOWN :
                // If we haven't reached the maximum distance, continue
                if (this.distanceFromOrigin <= this.maxDistance)
                {
                    this.distanceFromOrigin += this.monsterSpeed;
                    verticalSpeed = this.monsterSpeed;
                }
                else
                {
                    this.direction = MonsterConstants.DIRECTION_UP;
                }

                break;

            case MonsterConstants.DIRECTION_UP :

                if (this.distanceFromOrigin >= 0)
                {
                    this.distanceFromOrigin -= this.monsterSpeed;
                    verticalSpeed = -this.monsterSpeed;
                }
                else
                {
                    this.direction = MonsterConstants.DIRECTION_DOWN;
                }

                break;
        }

        this.sprite.x += horizontalSpeed ;
        this.sprite.y += verticalSpeed ;
    }
}
