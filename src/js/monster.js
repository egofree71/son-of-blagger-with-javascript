import { GameStates } from "./gameStates.js";
import { MonsterConstants } from "./monsterConstants.js";

// Monster object
export function Monster(monsterProperties, tileProperties)
{
    this.firstPositionX = monsterProperties.x;
    this.firstPositionY = monsterProperties.y - MonsterConstants.TILED_TO_PHASER_Y_OFFSET;
    this.distanceFromOrigin = 0;

    this.monsterSpeed = MonsterConstants.DEFAULT_SPEED;
    // Add the bounding box for the collision
    this.realWidth = parseInt(tileProperties.width);
    this.realHeight = parseInt(tileProperties.height);
    this.collisionOffsetX = parseInt(tileProperties.offsetX);
    this.collisionOffsetY = parseInt(tileProperties.offsetY);

    this.direction = monsterProperties.properties[MonsterConstants.PROPERTY_DIRECTION];
    this.level = parseInt(monsterProperties.properties[MonsterConstants.PROPERTY_LEVEL]);
    this.maxDistance = parseInt(monsterProperties.properties[MonsterConstants.PROPERTY_MAX_DISTANCE]);

    // Create a new sprite for the current monster
    // Phaser uses top-left coordinates while Tiled stores this object lower on the vertical axis.
    this.sprite = game.add.sprite(monsterProperties.x, monsterProperties.y - MonsterConstants.TILED_TO_PHASER_Y_OFFSET, monsterProperties.type);
    game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
    this.sprite.animations.add(MonsterConstants.ANIMATION_DEFAULT, MonsterConstants.ANIMATION_FRAMES, MonsterConstants.ANIMATION_FRAME_RATE, true);
};

Monster.prototype.updatePosition = function()
{
    if (GameController.gameState != GameStates.PLAYING) return ;

    Level.animationCounter -= 1;

    // If the counter is empty, update the monster's position
    if (Level.animationCounter == 0)
    {
        this.sprite.animations.next();
        Level.animationCounter = Level.animationCounterMax;
    }

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
};

window.Monster = Monster;
