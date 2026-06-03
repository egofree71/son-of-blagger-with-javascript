import { HudConstants } from "./hudConstants.ts";

export interface TiledObject {
	x: number;
	y: number;
	width?: number;
	height?: number;
	type?: string;
	properties: Record<string, any>;
}

export interface MonsterTileProperties {
	type?: string;
	width?: string | number;
	height?: string | number;
	offsetX?: string | number;
	offsetY?: string | number;
	[key: string]: any;
}

/**
 * Shared helper functions that are not gameplay collision checks.
 *
 * Util is now exported as an ES module so files can depend on it explicitly.
 * It is still intentionally pragmatic: Phaser 2.3 objects are typed loosely
 * while the migration is still focused on preserving gameplay behavior.
 */
export const Util =
{
	// Create sprites from a given tile and put them into the group
	createSpritesFromTiles : function(tileIndex: number, spriteSheet: string, animationSpeed: number): any
	{
		var group = game.add.group();
		group.enableBody = true;

		map.createFromTiles(tileIndex, 30, spriteSheet, 'background', group);

		// Set the animation for this group
		group.callAll('animations.add', 'animations', group, [0, 1, 2, 3, 4, 5, 6, 7], animationSpeed, true);
		group.callAll('animations.play', 'animations', group);

		return group;
	},

	// Find objects in a given layer that contains a property called "type" equal to a certain value
	findObjectsByProperty : function(tileMap: any, propertyName: string, propertyValue: any, layerName: string): TiledObject[]
	{
		var result: TiledObject[] = [];

		tileMap.objects[layerName].forEach(function(object: TiledObject)
		{
			if (object.properties[propertyName] == propertyValue)
				result.push(object);
		});

		return result;
	},

	// In the monsters tileset, return the tile properties of a given type
	getMonstersTileProperties : function(type: string): MonsterTileProperties | undefined
	{
		var tileProperties: Record<string, MonsterTileProperties> = map.tilesets[1].tileProperties;

		// Loop through all properties of the tileset
		for (var key in tileProperties)
			if (tileProperties[key].type == type)
				return tileProperties[key];

	},

	// Draw a text with the 'blagger' font
	drawFontText : function(text: string, x: number, y: number, color?: number): any
	{
		var charWidth = HudConstants.CHAR_WIDTH;

	    var font = game.add.retroFont(HudConstants.FONT_KEY, HudConstants.FONT_CHAR_WIDTH, HudConstants.FONT_CHAR_HEIGHT, Phaser.RetroFont.TEXT_SET2);
	    font.text = text;
	    var image = game.add.image(charWidth * x, charWidth * y, font);

	    // If color is not defined, use white
	    if (!color)
	        image.tint = HudConstants.COLOR_WHITE;
	    else
	        image.tint = color;

	    image.anchor.set(0);
	    image.fixedToCamera = true;

		return font;
	}

};
