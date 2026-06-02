/**
 * PlayerMovement owns the frame-by-frame movement rules for Slippery Sid.
 *
 * The code is intentionally close to the original Player.update() logic:
 * most collision probes still use hard-coded pixel offsets because these values
 * define the actual feel of the old platforming behavior.
 *
 * This object does not handle gameplay interactions such as collecting keys,
 * touching deadly tiles, touching monsters, or reaching the exit. Those checks
 * remain in PlayerInteractions.
 */
var PlayerMovement =
{
    FOOT_LEFT_OFFSET : 7,
    FOOT_RIGHT_OFFSET : 23,
    SLIDE_PROBE_Y_OFFSET : 14,

    LADDER_LEFT_OFFSET : 7,
    LADDER_RIGHT_OFFSET : 23,
    LADDER_TOP_FROM_BOTTOM_OFFSET : 18,
    LADDER_BOTTOM_FROM_BOTTOM_OFFSET : 1,

    WALL_ABOVE_Y_OFFSET : -2,
    RIGHT_WALL_X_OFFSET : 24,
    LEFT_WALL_X_OFFSET : 5,
    SIDE_WALL_TOP_OFFSET : 6,
    SIDE_WALL_BOTTOM_OFFSET : 1,

    MOVE_STEP : 1,
    JUMP_FALL_START_INDEX : 50,

    /**
     * Updates movement for one frame.
     *
     * Returns the coordinates captured at the beginning of the frame. Player
     * interactions intentionally use these original coordinates to preserve the
     * collision timing of the pre-refactoring implementation.
     */
    update : function(player)
    {
        var direction = {
            horizontal : null,
            vertical : null
        };

        var startPosition = {
            x : player.playerSprite.body.x,
            y : player.playerSprite.body.y
        };

        if (player.deadlyFall)
        {
            this.updateDeadlyFall(player, startPosition.x, startPosition.y);
            return {
                x : startPosition.x,
                y : startPosition.y,
                checkInteractions : false
            };
        }

        if (player.fallHeight == 0 && player.jumping == false)
            this.handleGroundInput(player, direction);

        if (player.jumping)
            this.updateJump(player, direction, startPosition.x, startPosition.y);

        if (player.jumping == false)
            this.updateGroundAndEnvironment(player, direction, startPosition.x, startPosition.y);

        this.blockInvalidMovement(player, direction, startPosition.x, startPosition.y);
        this.applyMovement(player, direction);

        return {
            x : startPosition.x,
            y : startPosition.y,
            checkInteractions : true
        };
    },

    updateDeadlyFall : function(player, x, y)
    {
        player.playerSprite.body.y += this.MOVE_STEP;

        if (this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, true))
        {
            player.fallHeight = 0;
            player.kill();
        }
    },

    handleGroundInput : function(player, direction)
    {
        if (game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR))
        {
            player.jumping = true;
            player.jumpIndex = 0;
            player.jumpingDirection = null;
        }

        if (keyPressed.right.isDown)
        {
            if (player.jumping)
                player.jumpingDirection = PlayerStates.RIGHT;

            direction.horizontal = PlayerStates.RIGHT;
            this.resetAnimationIfChangingDirection(player, PlayerStates.ANIMATION_LEFT, PlayerStates.ANIMATION_RIGHT);
            player.playRight();
        }

        if (keyPressed.left.isDown)
        {
            if (player.jumping)
                player.jumpingDirection = PlayerStates.LEFT;

            direction.horizontal = PlayerStates.LEFT;
            this.resetAnimationIfChangingDirection(player, PlayerStates.ANIMATION_RIGHT, PlayerStates.ANIMATION_LEFT);
            player.playLeft();
        }
    },

    resetAnimationIfChangingDirection : function(player, previousAnimation, newAnimation)
    {
        if (player.playerSprite.animations.currentAnim.name == previousAnimation)
        {
            player.playerSprite.animations.play(newAnimation);
            player.playerSprite.animations.stop();

            if (newAnimation == PlayerStates.ANIMATION_RIGHT)
                player.animationRightCounter = player.animationMaxCounter;
            else
                player.animationLeftCounter = player.animationMaxCounter;
        }
    },

    updateJump : function(player, direction, x, y)
    {
        if (player.jumpingDirection == PlayerStates.LEFT)
            player.playLeft();

        if (player.jumpingDirection == PlayerStates.RIGHT)
            player.playRight();

        player.jumpIndex += 1;

        if (player.jumpIndex >= this.JUMP_FALL_START_INDEX)
        {
            player.fallHeight += 1;

            if (this.isLandingAfterJump(player, x, y))
            {
                player.jumping = false;
                player.fallHeight = 0;
                player.playerSprite.animations.stop();
            }
            else if (player.fallHeight == player.fallLimit)
            {
                this.startDeadlyFall(player);
            }
        }

        if (player.jumping == true)
        {
            direction.vertical = Data.jumpPath[player.jumpIndex][1];

            if (Data.jumpPath[player.jumpIndex][0] == false)
                direction.horizontal = null;
            else
                direction.horizontal = player.jumpingDirection;

            if (player.jumpIndex >= Data.jumpPath.length - 1)
                player.jumping = false;
        }
    },

    updateGroundAndEnvironment : function(player, direction, x, y)
    {
        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_LEFT_SLIDE, this.SLIDE_PROBE_Y_OFFSET))
        {
            direction.horizontal = PlayerStates.LEFT;
            direction.vertical = PlayerStates.DOWN;
            player.fallHeight = 0;
        }

        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_RIGHT_SLIDE, this.SLIDE_PROBE_Y_OFFSET))
        {
            direction.horizontal = PlayerStates.RIGHT;
            direction.vertical = PlayerStates.DOWN;
            player.fallHeight = 0;
        }

        if (direction.vertical == null)
            this.updateFalling(player, direction, x, y);

        this.applyConveyorBelts(player, direction, x, y);

        if (this.isOnLadder(player, x, y))
            direction.vertical = PlayerStates.UP;

        if (keyPressed.left.isUp && keyPressed.right.isUp)
            player.playerSprite.animations.stop();
    },

    updateFalling : function(player, direction, x, y)
    {
        if (this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, false) == false &&
            CollisionDetector.collisionLineWithVanishingPlatform(
                x + this.FOOT_LEFT_OFFSET,
                x + this.FOOT_RIGHT_OFFSET,
                y + player.playerSprite.body.height) == false)
        {
            direction.vertical = PlayerStates.DOWN;
            direction.horizontal = null;
            player.playerSprite.animations.stop();

            player.fallHeight += 1;

            if (player.fallHeight == player.fallLimit)
                this.startDeadlyFall(player);
        }
        else
        {
            player.fallHeight = 0;
        }
    },

    applyConveyorBelts : function(player, direction, x, y)
    {
        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_CONVEYOR_RIGHT, 0))
        {
            if (direction.horizontal == PlayerStates.LEFT)
                direction.horizontal = null;
            else
                direction.horizontal = PlayerStates.RIGHT;
        }

        if (this.isOnTileByName(player, x, y, LevelConstants.TILE_NAME_CONVEYOR_LEFT, 0))
        {
            if (direction.horizontal == PlayerStates.RIGHT)
                direction.horizontal = null;
            else
                direction.horizontal = PlayerStates.LEFT;
        }
    },

    blockInvalidMovement : function(player, direction, x, y)
    {
        if (direction.vertical == PlayerStates.UP &&
            CollisionDetector.horizontalCollisionLine(
                x + this.FOOT_LEFT_OFFSET,
                x + this.FOOT_RIGHT_OFFSET,
                y + this.WALL_ABOVE_Y_OFFSET,
                LevelConstants.TILED_PROPERTY_NAME,
                LevelConstants.TILE_NAME_WALL))
        {
            direction.vertical = null;
        }

        if (direction.horizontal == PlayerStates.RIGHT &&
            CollisionDetector.verticalCollisionLine(
                y + this.SIDE_WALL_TOP_OFFSET,
                y + player.playerSprite.body.height - this.SIDE_WALL_BOTTOM_OFFSET,
                x + this.RIGHT_WALL_X_OFFSET,
                LevelConstants.TILED_PROPERTY_NAME,
                LevelConstants.TILE_NAME_WALL,
                false))
        {
            direction.horizontal = null;
        }

        if (direction.horizontal == PlayerStates.LEFT &&
            CollisionDetector.verticalCollisionLine(
                y + this.SIDE_WALL_TOP_OFFSET,
                y + player.playerSprite.body.height - this.SIDE_WALL_BOTTOM_OFFSET,
                x + this.LEFT_WALL_X_OFFSET,
                LevelConstants.TILED_PROPERTY_NAME,
                LevelConstants.TILE_NAME_WALL,
                false))
        {
            direction.horizontal = null;
        }
    },

    applyMovement : function(player, direction)
    {
        if (direction.horizontal == PlayerStates.RIGHT)
            player.playerSprite.body.x += this.MOVE_STEP;

        if (direction.horizontal == PlayerStates.LEFT)
            player.playerSprite.body.x -= this.MOVE_STEP;

        if (direction.vertical == PlayerStates.DOWN)
            player.playerSprite.body.y += this.MOVE_STEP;

        if (direction.vertical == PlayerStates.UP)
            player.playerSprite.body.y -= this.MOVE_STEP;
    },

    isLandingAfterJump : function(player, x, y)
    {
        return this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SOLID, true) ||
            this.hasGroundBelow(player, x, y, LevelConstants.TILE_TYPE_SLIDE, true) ||
            CollisionDetector.collisionLineWithVanishingPlatform(
                x + this.FOOT_LEFT_OFFSET,
                x + this.FOOT_RIGHT_OFFSET,
                y + player.playerSprite.body.height);
    },

    hasGroundBelow : function(player, x, y, tileType, onTop)
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.playerSprite.body.height,
            LevelConstants.TILED_PROPERTY_TYPE,
            tileType,
            onTop);
    },

    isOnTileByName : function(player, x, y, tileName, yOffset)
    {
        return CollisionDetector.horizontalCollisionLine(
            x + this.FOOT_LEFT_OFFSET,
            x + this.FOOT_RIGHT_OFFSET,
            y + player.playerSprite.body.height + yOffset,
            LevelConstants.TILED_PROPERTY_NAME,
            tileName,
            false);
    },

    isOnLadder : function(player, x, y)
    {
        return CollisionDetector.collisionRectangle(
            x + this.LADDER_LEFT_OFFSET,
            y + player.playerSprite.body.height - this.LADDER_TOP_FROM_BOTTOM_OFFSET,
            x + this.LADDER_RIGHT_OFFSET,
            y + player.playerSprite.body.height - this.LADDER_BOTTOM_FROM_BOTTOM_OFFSET,
            LevelConstants.TILED_PROPERTY_NAME,
            LevelConstants.TILE_NAME_LADDER);
    },

    startDeadlyFall : function(player)
    {
        player.deadlyFall = true;
        player.playerSprite.loadTexture(PlayerStates.SPRITE_BLAGGER_WHITE, player.playerSprite.animations.currentAnim.frame);
    }
};
