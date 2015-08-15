var Util =
{
	// Store the last tile which was hit with the player
	lastTileHit : null,

	// Check if there are some tiles with a given property on a horizontal line
	horizontalCollisionLine : function(xStart, xEnd, yPosition, propertyName, propertyValue, onTop)
	{
		var collision = false;

		// Check every horizontal position
		for(var xPosition = xStart; xPosition <= xEnd; xPosition++)
		{
			var tile = map.getTileWorldXY(xPosition, yPosition);

			if (tile == null) continue;

			if (tile.properties[propertyName] == propertyValue && tile.alpha == 1)
			{
				if (onTop && yPosition != tile.worldY) continue;

				this.lastTileHit = tile;
				collision = true;
				break;

			}
		}

		return collision;
	},

	// Check if there are some tiles with a given property on a vertical line
	verticalCollisionLine : function(yStart, yEnd, xPosition, propertyName, propertyValue, onTop)
	{
		var collision = false;

		// Check every vertical position
		for(var yPosition = yStart; yPosition <= yEnd; yPosition++)
		{
			var tile = map.getTileWorldXY(xPosition, yPosition);

			if (tile != null && tile.properties[propertyName] == propertyValue && tile.alpha == 1)
			{
				this.lastTileHit = tile;

				collision = true;
				break;
			}
		}

		return collision;
	},

	// Check if there are some tiles with a given property on the bounds of a rectangle
	collisionRectangle : function(xStart, yStart, xEnd, yEnd, propertyName, propertyValue)
	{
		// Check the upper bound
		if (this.horizontalCollisionLine(xStart, xEnd, yStart, propertyName, propertyValue, false))
			return true;

		// Check the bottom bound
		if (this.horizontalCollisionLine(xStart, xEnd, yEnd, propertyName, propertyValue, false))
			return true;

		// Check the left bound
		if (this.verticalCollisionLine(yStart, yEnd, xStart, propertyName, propertyValue, false))
			return true;

		// Check the right bound
		if (this.verticalCollisionLine(yStart, yEnd, xEnd, propertyName, propertyValue, false))
			return true;

		return false;
	},

	// Check if there is a collision between the player and the 'end level' object
	collisionRectangleWithEndLevel : function(xStart, yStart, xEnd, yEnd)
	{
		var playerRectangle = new Phaser.Rectangle(xStart, yStart, xEnd - xStart, yEnd - yStart);
		var endLevelRectangle = new Phaser.Rectangle(Level.endLevel.x, Level.endLevel.y, Level.endLevel.width, Level.endLevel.height);

		// If there is a collision
		if (Phaser.Rectangle.intersects(playerRectangle, endLevelRectangle))
			return true;
	},

	// Check if there is a collision with a monster for a given region
	collisionRectangleWithMonsters : function(xStart, yStart, xEnd, yEnd)
	{
		// Set the collision area for the player
		var playerRectangle = new Phaser.Rectangle(xStart, yStart, xEnd - xStart, yEnd - yStart);

		// For each monster
		for (var i=0; i < Level.monsters.length; i++)
		{
			var monster = Level.monsters[i];

			// Set the collision area for the monster
			var monsterRectangle = new Phaser.Rectangle(monster.sprite.x + monster.collisionOffsetX, monster.sprite.y + monster.collisionOffsetY,
														monster.realWidth, monster.realHeight);

			// If there is a collision
			if (Phaser.Rectangle.intersects(playerRectangle, monsterRectangle))
				return true;
		}

		return false;

	},

	// Check if there are some vanishing platforms on a horizontal line
	collisionLineWithVanishingPlatform : function(xStart, xEnd, yPosition)
	{
		var collision = false;

		// Check every horizontal position
		for(var xPosition = xStart; xPosition <= xEnd; xPosition++)
		{
			var tile = map.getTileWorldXY(xPosition, yPosition);

			if (tile != null && tile.properties["name"] == "vanishing platform")
			{
				// If the platform has not disappeared and the player is above
				if (vanishingPlatformGroup.getAt(0).animations.currentAnim.currentFrame.index != 4 &&
					yPosition == tile.worldY)
				{
					collision = true;
					break;
				}
			}
		}

		return collision;
	},

	// Create sprites from a given tile and put them into the group
	createSpritesFromTiles : function(tileIndex, spriteSheet, animationSpeed)
	{
		var group = game.add.group();
		group.enableBody = true;

		map.createFromTiles(tileIndex, 30, spriteSheet, 'background', group);

		// Set the animation for this group
		group.callAll('animations.add', 'animations', group, [0, 1, 2, 3, 4, 5, 6, 7], animationSpeed, true);
		group.callAll('animations.play', 'animations', group);

		return group;
	},

	//find objects in a given layer that containt a property called "type" equal to a certain value
	findObjectsByProperty : function(map, propertyName, propertyValue, layer)
	{
		var result = new Array();

		map.objects[layer].forEach(function(object)
		{
			if (object.properties[propertyName] == propertyValue)
				result.push(object);
		});

		return result;
	},

	//create a sprite from an object
	createFromTiledObject : function(element, group)
	{
		var sprite = group.create(element.x, element.y, element.properties.sprite);

		//copy all properties to the sprite
		Object.keys(element.properties).forEach(function(key)
		{
			sprite[key] = element.properties[key];
		});
	},

	// In the monsters tileset, return the tile properties of a given type
	getMonstersTileProperties : function(type)
	{
		var tileProperties = map.tilesets[1].tileProperties;

		// Loop through all properties of the tileset
		for (var key in tileProperties)
			if (tileProperties[key].type == type)
				return tileProperties[key];

	},

	// Draw a text with the 'blagger' font
	drawFontText : function(text, x, y, color)
	{
		var charWidth = 16;

	    var font = game.add.retroFont('blaggerFont', 16, 16, Phaser.RetroFont.TEXT_SET2);
	    font.text = text;
	    var image = game.add.image(charWidth * x, charWidth * y, font);

	    // If color is not defined, use white
	    if (!color)
	        image.tint = 0xFFFFFF;
	    else
	        image.tint = color;

	    image.anchor.set(0);
	    image.fixedToCamera = true;

		return font;
	}

}
