// Monster object
function Monster(monsterProperties, tileProperties)
{
    this.firstPositionX = monsterProperties.x;
    this.firstPositionY = monsterProperties.y - 42;
    this.distanceFromOrigin = 0;

    this.monsterSpeed = 0.5;
    // Add the bounding box for the collision
    this.realWidth = parseInt(tileProperties.width);
    this.realHeight = parseInt(tileProperties.height);
    this.collisionOffsetX = parseInt(tileProperties.offsetX);
    this.collisionOffsetY = parseInt(tileProperties.offsetY);

    this.direction = monsterProperties.properties.direction;
    this.level = parseInt(monsterProperties.properties.level);
    this.maxDistance = parseInt(monsterProperties.properties.maxDistance);

    // Create a new sprite for the current monster
    // Phaser uses top left, tiled bottom left so we have to subtract 42 to the vertical position
    this.sprite = game.add.sprite(monsterProperties.x, monsterProperties.y - 42, monsterProperties.type);
    game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
    this.sprite.animations.add('animation', [0, 1], 10, true);
};

Monster.prototype.updatePosition = function()
{
    if (GameController.gameState != "playing") return ;

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
        case "right" :

            // If we haven't reached the maximum distance, continue
            if (this.distanceFromOrigin <= this.maxDistance)
            {
                this.distanceFromOrigin += this.monsterSpeed;
                horizontalSpeed = this.monsterSpeed;
            }
            else
            {
                this.direction = "left";
            }

            break;

        case "left" :

            if (this.distanceFromOrigin >= 0)
            {
                this.distanceFromOrigin -= this.monsterSpeed;
                horizontalSpeed = -this.monsterSpeed;
            }
            else
            {
                this.direction = "right";
            }

            break;

        case "down" :
            // If we haven't reached the maximum distance, continue
            if (this.distanceFromOrigin <= this.maxDistance)
            {
                this.distanceFromOrigin += this.monsterSpeed;
                verticalSpeed = this.monsterSpeed;
            }
            else
            {
                this.direction = "up";
            }

            break;

        case "up" :

            if (this.distanceFromOrigin >= 0)
            {
                this.distanceFromOrigin -= this.monsterSpeed;
                verticalSpeed = -this.monsterSpeed;
            }
            else
            {
                this.direction = "down";
            }

            break;
    }

    this.sprite.x += horizontalSpeed ;
    this.sprite.y += verticalSpeed ;
}
