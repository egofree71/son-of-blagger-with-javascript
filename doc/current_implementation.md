# Son of Blagger — Current Implementation

Document updated after **refactoring step 8**.

This document describes the current state of the JavaScript / Phaser remake of **Son of Blagger**. It is meant to be a practical entry point when returning to the project after a break, understanding the responsibilities of the main files, and preparing future refactorings without breaking the existing gameplay.

## Project goal

This project is a web remake of the Commodore 64 game **Son of Blagger**.

The player controls Slippery Sid through a series of maze-like levels. The goal is to collect all keys in the current level, avoid enemies and traps, then reach the exit to move on to the next level.

The current refactoring goal is to modernize the code gradually while preserving the existing behavior of the game.

## Current technical state

- Engine: **Phaser 2.3**.
- Language: classic JavaScript, with no ES6 modules and no TypeScript.
- Architecture: global objects and constructor functions.
- Map: Tiled JSON file loaded by Phaser.
- Rendering: Phaser sprites, Phaser tilemap, bitmap/retro font.
- Physics: Phaser Arcade Physics, although many collisions are still computed manually through tile checks.
- Persistence: the hi-score is stored in `localStorage`.

The project is intentionally still close to its original style. Recent refactorings mainly isolated some responsibilities without changing the engine or the gameplay.

## Running the game locally

From the project root:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

It is better to use a small local HTTP server instead of opening `index.html` directly, because browsers may block or mishandle some file loading when running under `file:///`.

## General file organization

### `index.html`

HTML entry point of the game.

It loads Phaser and then all project JavaScript files in an important order, because the code relies on global objects.

The logical order is:

```html
<script src="js/phaser.min.js"></script>
<script src="js/gameStates.js"></script>
<script src="js/playerStates.js"></script>
<script src="js/monsterConstants.js"></script>
<script src="js/levelConstants.js"></script>
<script src="js/hudConstants.js"></script>
<script src="js/main.js"></script>
<script src="js/util.js"></script>
<script src="js/player.js"></script>
<script src="js/monster.js"></script>
<script src="js/data.js"></script>
<script src="js/levelTransition.js"></script>
<script src="js/level.js"></script>
<script src="js/HUD.js"></script>
<script src="js/gameController.js"></script>
```

If a global object is used before it has been loaded, the game may crash with a `ReferenceError`.

### `js/main.js`

Phaser initialization file.

Main responsibilities:

- create the Phaser instance:

```js
var game = new Phaser.Game(640, 400, Phaser.AUTO, '', { preload: preload, create: create, update: updateGame });
```

- load assets in `preload()`;
- create the tilemap and layers in `create()`;
- initialize Arcade Physics;
- create animated sprites from some tiles;
- create the player;
- initialize monsters;
- initialize the HUD;
- create the black rectangles used for the progressive level reveal;
- start the game with the `GameStates.LOAD_INTRODUCTION` state;
- delegate every frame to `GameController.update()`.

Important global variables created here:

- `game`
- `map`
- `layer`
- `keyPressed`
- `vanishingPlatformGroup`

These variables are still used by several other global objects. Eventually, they could be grouped into a context object or encapsulated inside a modern Phaser scene.

### `js/gameStates.js`

Centralized list of game states.

Before refactoring step 2, states were written as raw strings in several files, for example:

```js
"playing"
"end level"
"load level"
```

They are now grouped in `GameStates`, for example:

```js
GameStates.PLAYING
GameStates.END_LEVEL
GameStates.LOAD_LEVEL
```

The original string values were preserved to avoid changing the existing behavior.

### `js/playerStates.js`

Centralized list of player-related constants.

Despite the name, this file does not introduce a full player state machine yet. The current player implementation still uses runtime flags such as:

```js
Player.jumping
Player.deadlyFall
```

For this step, `PlayerStates` only centralizes the raw string values used by `player.js` for movement directions and animation names, for example:

```js
PlayerStates.LEFT
PlayerStates.RIGHT
PlayerStates.UP
PlayerStates.DOWN
PlayerStates.ANIMATION_LEFT
PlayerStates.ANIMATION_RIGHT
PlayerStates.ANIMATION_BLAGGER_DYING
```

This is deliberately low risk: the existing movement, jump, fall and death logic remain unchanged.

### `js/monsterConstants.js`

Centralized list of monster-related constants.

This file was added in refactoring step 6. It does not change monster behavior. It only gives names to raw values used by `monster.js`, such as:

```js
MonsterConstants.DIRECTION_RIGHT
MonsterConstants.DIRECTION_LEFT
MonsterConstants.DIRECTION_DOWN
MonsterConstants.DIRECTION_UP
MonsterConstants.DEFAULT_SPEED
MonsterConstants.TILED_TO_PHASER_Y_OFFSET
MonsterConstants.ANIMATION_DEFAULT
```

The direction strings still match the values stored in the Tiled map properties. This is important: changing them would break monster movement unless the map data was changed too.

### `js/levelConstants.js`

Centralized list of constants used by `level.js`.

This file was added in refactoring step 7. It does not change level behavior. It only gives names to raw values used by `level.js`, such as:

```js
LevelConstants.DEFAULT_AIR_LEVEL
LevelConstants.TILED_PROPERTY_LEVEL
LevelConstants.OBJECT_LAYER_MONSTERS
LevelConstants.OBJECT_LAYER_END_LEVEL
LevelConstants.TILE_KEY_INDEX
LevelConstants.END_LEVEL_Y_OFFSET
LevelConstants.DISPLAY_STEP_INITIALIZE
LevelConstants.END_GAME_SCORE_INCREMENT
```

Some constants represent conventions coming from the Tiled map, such as the `level` property or the `end level` object layer. These values must stay synchronized with the map data. Others are preserved timing, positioning or scoring values from the previous implementation.

### `js/hudConstants.js`

Centralized list of constants used by `HUD.js`.

This file was added in refactoring step 8. It does not change HUD behavior. It only gives names to raw values used by `HUD.js`, such as:

```js
HudConstants.CHAR_WIDTH
HudConstants.AIR_DECREASE_DELAY
HudConstants.BONUS_MAN_COLOR_DELAY
HudConstants.BONUS_MAN_SPRITE_KEY
HudConstants.LABEL_AIR
HudConstants.LABEL_HI_SCORE
HudConstants.COLOR_AIR_BLUE
HudConstants.COLOR_GREY
```

The constants cover HUD layout positions, label strings, colors, digit formatting, air bar drawing values, bonus man color animation timing, and the retro font configuration. The existing air depletion timing, bonus man animation, text positions, and bar dimensions are preserved.

### `js/gameController.js`

Main orchestrator of the game.

`GameController.update()` is called once per frame from `updateGame()` in `main.js`.

It uses `GameController.gameState` to decide which part of the game should run. Since refactoring step 4, the main `update()` method only dispatches to one small method per state. This keeps the game loop easier to scan while preserving the original state flow.

Main data:

- `gameState`
- `score`
- `hiScore`
- `lives`

State-specific methods:

- `updateLoadIntroduction()` displays the title screen and installs the first key-press callback;
- `updateLoadHelp()` displays the help screen;
- `updateLoadLevel()` loads the current level and refreshes the HUD;
- `updateDisplayLevel()` runs the progressive level reveal;
- `updateStartLevel()` runs the monster reveal sequence;
- `updatePlaying()` runs one normal gameplay frame;
- `updateEndLevel()` delegates to the end-of-level transition;
- `updateEndGame()` runs the final end-game sequence;
- `updateShowGameOver()` shows the game-over screen and waits for a key press.

During the `GameStates.PLAYING` state, `updatePlaying()` calls, in order:

```js
HUD.updateAirLevel();
HUD.displayBonusMan();
Level.updateMonsters();
Player.update();
```

This order is important and was preserved from the previous implementation.

### `js/level.js`

Global object responsible for level management.

Main responsibilities:

- keep track of the current level number;
- load the objects of the current level;
- create the monsters associated with the level;
- manage explosion and reverse-explosion groups;
- manage the level exit object;
- progressively reveal the level with two black rectangles;
- reveal monsters at the beginning of a level;
- handle the introduction, help screen, game over, and end-game screens;
- reset some game data.

Important data:

- `level`
- `airLevel`
- `keysTaken`
- `bonusMan`
- `monsters`
- `monstersGroup`
- `endLevel`
- `stepDisplayLevel`
- `stepEndGame`

Since refactoring step 1, the end-of-level transition is no longer implemented directly inside `Level`. The method:

```js
Level.goToNext()
```

now simply delegates to:

```js
LevelTransition.update()
```

Since refactoring step 7, raw strings and magic numbers used by `level.js` have been moved to `LevelConstants`. This includes Tiled layer/property names, the key tile index, the end-level Y offset, the default air level, level reveal steps, end-game score conversion values, and screen positions used by the title/help/game-over screens.

### `js/levelTransition.js`

Global object responsible for the transition between two levels.

This logic was previously embedded directly inside `Level.goToNext()` using numeric steps and counters. It was extracted to make the sequence easier to read and maintain.

The transition is a small internal state machine.

Current phases:

1. prepare the next level;
2. hide the monsters from the completed level;
3. restore the gray background;
4. precisely align the player on one axis;
5. convert the remaining air into score;
6. move the player toward the start point of the next level;
7. refill the air bar;
8. load the next level.

The behavior and timings were preserved as closely as possible compared with the previous implementation.

Notes:

- `MOVE_DELAY` corresponds to the old counter used to slow down tile-based movement;
- the main movement uses 16-pixel steps;
- the vertical `-42` offset is preserved because Tiled and Phaser do not reference objects in exactly the same way;
- the transition grants a `bonusMan` for the next level.

### `js/player.js`

Global object responsible for the player.

Responsibilities:

- create the player sprite;
- position the player at the beginning of the level;
- read keyboard input;
- handle horizontal movement;
- handle jumping;
- handle falling;
- detect deadly falls;
- handle conveyor belts;
- handle slippery platforms;
- handle ladders;
- collect keys;
- detect deadly collisions;
- detect the level exit;
- play the death animation;
- restart the level or trigger game over.

Important data:

- `jumping`
- `jumpIndex`
- `jumpingDirection`
- `fallHeight`
- `fallLimit`
- `deadlyFall`
- `playerSprite`
- `playerDyingSprite`

Since refactoring step 5, repeated raw strings for player movement directions and player animation names have been moved to `PlayerStates`. The player logic itself is still the same: jumping, falling and deadly falls are still tracked with the existing booleans and counters.

The jump uses the `Data.jumpPath` array, which contains the vertical and horizontal movement for each jump step. This logic is very specific to the current gameplay and should be modified carefully.

When the player picks up a key:

- `Level.keysTaken` increases;
- the score increases;
- the touched tile becomes invisible;
- the layer is marked as `dirty`.

When all keys have been collected and the player touches the exit:

- if this is the last level: `GameStates.END_GAME`;
- otherwise: `GameStates.END_LEVEL`.

### `js/monster.js`

Constructor function for monsters.

Each monster is created from a Tiled object and from collision properties stored in the monster tileset.

Responsibilities:

- create the monster sprite;
- read its initial direction;
- read its maximum movement distance;
- store its real hitbox;
- move the monster horizontally or vertically;
- reverse its direction when it reaches its maximum distance.

Monsters do not chase the player. They follow predefined paths.

Since refactoring step 6, repeated raw strings and small magic values used by `monster.js` have been moved to `MonsterConstants`. This includes monster directions, Tiled property names, the default monster speed, the monster animation name, and the existing vertical Tiled-to-Phaser offset.

Collision with the player is tested in `Util.collisionRectangleWithMonsters()`.

### `js/HUD.js`

Global object responsible for the HUD display.

Responsibilities:

- create the black area below the playfield;
- display the air bar;
- display lives;
- display the score;
- display the level number;
- display the hi-score;
- manage the bonus man;
- gradually decrease the air during gameplay.

Since refactoring step 8, repeated raw strings and magic values used by `HUD.js` have been moved to `HudConstants`. This includes HUD text labels, text positions, colors, air depletion timing, bonus man animation timing, digit formatting, and the retro font configuration.

Since refactoring step 9, the unused `displayLevelInfo()` helper has been removed. The level number is still refreshed by `HUD.update()`, which uses `Level.level`.

The air bar is decremented in:

```js
HUD.updateAirLevel()
```

During gameplay, if the air reaches zero, the player is killed through:

```js
Player.kill()
```

### `js/util.js`

Global object containing utility functions.

Main responsibilities:

- test collisions along a horizontal line;
- test collisions along a vertical line;
- test collisions along the edges of a rectangle;
- test collision with the level exit;
- test collision with monsters;
- test disappearing platforms;
- create animated sprites from tiles;
- find Tiled objects by property;
- retrieve monster tile properties;
- draw text using the game font.

Most player collisions rely on these functions. This makes `Util` very important for gameplay.

### `js/data.js`

Global object containing gameplay data.

Main contents:

- `jumpPath`: detailed jump trajectory;
- `levels`: number of keys per level and monster animation speed;
- `bonusManColors`: colors used to display the bonus man.

`Data.levels` is notably used to know how many keys are required to complete the current level:

```js
Data.levels[Level.level - 1][0]
```

## Simplified game lifecycle

```text
LOAD_INTRODUCTION
  -> INTRODUCTION
      -> LOAD_HELP -> HELP -> LOAD_INTRODUCTION
      -> LOAD_LEVEL
          -> DISPLAY_LEVEL
              -> START_LEVEL
                  -> DISPLAYING_MONSTERS
                      -> PLAYING
                          -> END_LEVEL -> START_LEVEL of next level
                          -> END_GAME -> LOAD_INTRODUCTION
                          -> SHOW_GAME_OVER -> GAME_OVER -> LOAD_INTRODUCTION
```

## Main game loop

Every frame:

```text
main.updateGame()
  -> GameController.update()
      -> dispatch to one state-specific update method
```

For example, during the `PLAYING` state:

```text
HUD.updateAirLevel()
HUD.displayBonusMan()
Level.updateMonsters()
Player.update()
```

The player is therefore updated after the monsters and after the air bar.

## Loading a level

Level loading is mainly handled in:

```js
Level.load()
```

This method:

1. resets air, keys, and bonus man to their initial state;
2. calls `Player.reset()`;
3. creates the level monsters through `Level.addMonsters()`;
4. finds the level exit object in Tiled;
5. creates or repositions the invisible exit sprite.

Then `HUD.update()` refreshes the displayed information.

## Progressive level reveal

The progressive reveal is handled by:

```js
Level.display()
```

Principle:

- two black rectangles hide the map;
- the rectangles gradually move away;
- when the rectangles are gone, the state changes to `GameStates.START_LEVEL`;
- `Level.displayMonsters()` plays the beginning-of-level monster reveal sequence;
- monsters become visible;
- the state changes to `GameStates.PLAYING`.

## Transition between levels

When all keys have been collected and the player touches the exit, `Player.update()` triggers:

```js
GameController.gameState = GameStates.END_LEVEL;
```

Then:

```text
GameController.update()
  -> Level.goToNext()
      -> LevelTransition.update()
```

The transition converts the remaining air into score, moves the player toward the next level, refills the air, then loads the new level.

## Player death

Player death is triggered by:

- collision with a deadly element;
- collision with a monster;
- deadly fall;
- depleted air.

The central method is:

```js
Player.kill()
```

It:

1. changes the game state;
2. hides the normal player sprite;
3. displays the death animation;
4. at the end of the animation, removes one life or consumes the bonus man;
5. reloads the level or triggers game over.

## Hi-score

The hi-score is read in `main.create()` with:

```js
localStorage.getItem('hiScore')
```

It is updated in `Level.resetGame()` if the current score is greater than the stored hi-score.

## Technical points to watch

### Global variables

The project still heavily depends on global variables:

- `game`
- `map`
- `layer`
- `keyPressed`
- `vanishingPlatformGroup`
- `GameController`
- `Level`
- `Player`
- `HUD`
- `Util`
- `Data`

This is acceptable for now, but it will be an important point if the project later migrates to TypeScript or to a modern Phaser version.

### No modules yet

Files are loaded through `<script>` tags in `index.html`. There is currently no module system, no import/export, and no bundler.

A future step could introduce Vite, but this has not been done yet.

### Manual collisions

Player collisions are very specific to the game and are often computed at the pixel level.

They should not be rewritten too early. Even a small change can alter the feel of the game.

### Counter-based sequences

Some sequences still use counters or numeric steps:

- progressive level reveal;
- end-game sequence;
- HUD animation;
- monster movement.

The transition between levels has already been isolated into `LevelTransition`, but other sequences could be clarified later.

### Directions, animation names, and Tiled property names

Player movement directions and player animation names are centralized in:

```text
js/playerStates.js
```

Monster directions, monster animation names, and the Tiled property names used by monsters are centralized in:

```text
js/monsterConstants.js
```

Level-related Tiled layer names, some sprite keys, level reveal steps, air values and end-game constants are centralized in:

```text
js/levelConstants.js
```

HUD labels, colors, layout positions, air timing, bonus man animation timing, and display formatting values are centralized in:

```text
js/hudConstants.js
```

This currently covers values such as:

```js
PlayerStates.LEFT
PlayerStates.RIGHT
PlayerStates.ANIMATION_LEFT
PlayerStates.ANIMATION_RIGHT
MonsterConstants.DIRECTION_RIGHT
MonsterConstants.DIRECTION_LEFT
MonsterConstants.PROPERTY_MAX_DISTANCE
MonsterConstants.ANIMATION_DEFAULT
LevelConstants.OBJECT_LAYER_END_LEVEL
LevelConstants.TILE_KEY_INDEX
LevelConstants.DEFAULT_AIR_LEVEL
LevelConstants.END_GAME_SCORE_INCREMENT
HudConstants.AIR_DECREASE_DELAY
HudConstants.LABEL_HI_SCORE
HudConstants.COLOR_AIR_BLUE
```

Other parts of the code may still contain raw strings related to Tiled properties, tile names, texture keys or screen names. Those should be cleaned up carefully and only when the meaning is clear.

### Tiled properties

The gameplay strongly depends on properties defined in the Tiled map and tilesets:

- `type`
- `name`
- `level`
- `direction`
- `maxDistance`
- monster hitbox properties

These conventions should be documented more precisely if the map is modified.

## Refactorings already done

### Step 1 — Extract end-of-level transition

Created:

```text
js/levelTransition.js
```

Goal: move the transition between levels out of `Level.goToNext()`.

### Step 2 — Centralize game states

Created:

```text
js/gameStates.js
```

Goal: replace scattered state strings with centralized constants.

### Step 3 — Document the current implementation

Created:

```text
doc/current_implementation.md
```

Goal: describe the current architecture, game lifecycle, major files, technical debt, and manual test checklist.

### Step 4 — Split `GameController.update()` into state-specific methods

Updated:

```text
js/gameController.js
```

Goal: keep the existing game-state switch, but delegate each state to a named method such as `updatePlaying()`, `updateLoadLevel()`, or `updateShowGameOver()`.

This does not change the game flow. It only makes the responsibilities of each state easier to read and prepares future refactorings.

### Step 5 — Centralize player constants

Created:

```text
js/playerStates.js
```

Updated:

```text
js/player.js
index.html
```

Goal: remove repeated raw strings from `player.js` for movement directions and player animation names, while preserving the current player movement logic.

### Step 6 — Centralize monster constants

Created:

```text
js/monsterConstants.js
```

Updated:

```text
js/monster.js
index.html
```

Goal: remove repeated raw strings and small magic values from `monster.js` for monster directions, Tiled object property names, monster animation configuration, default movement speed, and the existing vertical Tiled-to-Phaser offset. Monster paths and collision behavior remain unchanged.

### Step 7 — Centralize level constants

Created:

```text
js/levelConstants.js
```

Updated:

```text
js/level.js
index.html
doc/current_implementation.md
```

Goal: remove raw strings and magic values from `level.js` for Tiled layer/property names, the key tile index, sprite keys used by level screens, air and lives reset values, progressive level reveal values, end-level positioning, and end-game scoring/timing values. The level loading, monster reveal, level reveal and end-game behavior remain unchanged.

### Step 8 — Centralize HUD constants

Created:

```text
js/hudConstants.js
```

Updated:

```text
js/HUD.js
index.html
doc/current_implementation.md
```

Goal: remove raw strings and magic values from `HUD.js` for HUD labels, text positions, colors, air bar drawing, air depletion timing, bonus man animation timing, digit formatting, and retro font configuration. The HUD display, air depletion behavior, and bonus man animation remain unchanged.

### Step 9 — Remove unused HUD level helper

Updated:

```text
js/HUD.js
doc/current_implementation.md
```

Goal: remove the unused `HUD.displayLevelInfo()` method. The method was not called anywhere and also referenced an unqualified `level` variable. The active HUD level refresh remains handled by `HUD.update()`, which uses `Level.level`.

## Future refactoring ideas

### 1. Document Tiled conventions

Create a separate document, for example:

```text
doc/tiled_map_conventions.md
```

It would describe layers, expected properties, tile types, `player` objects, `end level` objects, `monsters`, etc.

### 2. Continue centralizing constants

`PlayerStates` centralizes direction and animation strings used by `player.js`.
`MonsterConstants` centralizes direction, property name, animation and speed values used by `monster.js`.
`LevelConstants` centralizes the first batch of raw strings and magic values used by `level.js`.
`HudConstants` centralizes labels, colors, positions, formatting values, and timing values used by `HUD.js`.

A future step could continue with:

- utility collision constants;
- raw tile names still used by `util.js` or `player.js`;
- asset keys still hard-coded in `main.js`;
- the remaining Tiled-to-Phaser vertical offsets used outside monster creation.

This should be done carefully, because some strings are gameplay data coming from the Tiled map.

### 3. Clean up implicit global variables

Some loops still use variables that are not explicitly declared, for example `i` in several files.

They should gradually be replaced with:

```js
for (var i = 0; i < ...; i++)
```

This is a small but important cleanup before a possible TypeScript migration.

### 4. Isolate HUD logic

HUD constants are now centralized and the unused `displayLevelInfo()` helper has been removed, but the HUD still mixes display, air depletion, and death logic when the air reaches zero.

Eventually, this could be split into:

- air timer logic;
- air bar display;
- gameplay effects when air is depleted.

### 5. Prepare a future TypeScript migration

Before moving to TypeScript, it would be useful to:

- reduce global variables;
- document the shape of Tiled objects;
- centralize constants;
- clarify the responsibilities of each object.

## Manual test checklist after refactoring

After each small refactoring step, test at least:

- game launch;
- title screen;
- access help with `h`;
- return from help;
- level 1 loading;
- left/right movement;
- jump;
- fall;
- key collection;
- collision with an enemy or a trap;
- losing a life;
- transition to the next level;
- score, lives, level number, and air display;
- no red JavaScript error in the console.

To quickly test the transition to the next level from the browser console:

```js
Level.keysTaken = Data.levels[Level.level - 1][0];
GameController.gameState = GameStates.END_LEVEL;
```

This command must not be turned into a keyboard shortcut that is active in production. If a debug system is added later, it should be explicitly enabled, for example through a URL parameter such as `?debug=1`.
