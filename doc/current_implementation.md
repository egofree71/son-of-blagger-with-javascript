# Son of Blagger — Current Implementation

This document describes the current architecture of the JavaScript / Phaser remake of **Son of Blagger**.

Its purpose is to help someone understand the project as it exists today: the runtime structure, the main global objects, the gameplay flow, the responsibilities of each file, and the technical points to watch before making further changes.

It is not a changelog. Historical refactoring steps are intentionally not listed here.

## Project goal

This project is a web remake of the Commodore 64 game **Son of Blagger**.

The player controls Slippery Sid through maze-like levels. The goal is to collect all keys in the current level, avoid enemies and traps, then reach the exit to move on to the next level.

The current engineering goal is to keep the original gameplay behavior intact while gradually making the code easier to maintain, understand, and eventually modernize.

## Technical overview

- Engine: **Phaser 2.3.0**.
- Language: classic JavaScript.
- Module system: none. Files are loaded through `<script>` tags.
- Main architecture style: global objects and constructor functions.
- Map format: Tiled JSON map loaded by Phaser.
- Rendering: Phaser sprites, Phaser tilemap layers, generated bitmap-style text.
- Physics: Phaser Arcade Physics is enabled, but many gameplay collisions are still handled manually through tile and rectangle checks.
- Persistence: the hi-score is stored in `localStorage`.

The codebase is still close to its original browser-JavaScript style. Several responsibilities have been isolated into dedicated global objects, but the project has not yet moved to ES modules, TypeScript, Phaser 3, or Phaser 4.

## Running the game locally

From the project root:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Using a local HTTP server is preferable to opening `index.html` directly, because browsers can block or mishandle asset loading under `file:///`.

## File loading order

The project relies on globals, so script order in `index.html` matters.

Current logical order:

```html
<script src="js/phaser.min.js"></script>
<script src="js/gameStates.js"></script>
<script src="js/playerStates.js"></script>
<script src="js/monsterConstants.js"></script>
<script src="js/levelConstants.js"></script>
<script src="js/hudConstants.js"></script>
<script src="js/levelRevealSequence.js"></script>
<script src="js/main.js"></script>
<script src="js/util.js"></script>
<script src="js/screenManager.js"></script>
<script src="js/playerMovement.js"></script>
<script src="js/playerInteractions.js"></script>
<script src="js/playerDeathSequence.js"></script>
<script src="js/player.js"></script>
<script src="js/monster.js"></script>
<script src="js/data.js"></script>
<script src="js/levelObjectLoader.js"></script>
<script src="js/levelTransition.js"></script>
<script src="js/level.js"></script>
<script src="js/endGameSequence.js"></script>
<script src="js/HUD.js"></script>
<script src="js/gameController.js"></script>
```

If a file uses a global object before that object is loaded, the game will fail with a `ReferenceError`.

## Main runtime objects

The project is organized around a set of global objects:

- `GameController`: high-level game state orchestration.
- `ScreenManager`: title, help, and game-over screens.
- `Level`: current level data, level loading orchestration, monsters, exit object, and level reset logic.
- `LevelObjectLoader`: Tiled object lookup and Phaser sprite creation for level-owned objects.
- `LevelRevealSequence`: frame-by-frame reveal of the level at the beginning of each stage.
- `LevelTransition`: transition between two levels after all keys have been collected.
- `EndGameSequence`: final congratulations sequence.
- `Player`: player movement, jumping, falling, and death triggering.
- `PlayerMovement`: keyboard input and movement rules for the player.
- `PlayerInteractions`: key collection, deadly collision checks, and exit detection for the player.
- `PlayerDeathSequence`: death animation, bonus-man/life handling, level reload or game-over decision.
- `Monster`: constructor function for enemy instances.
- `HUD`: air bar, lives, score, level number, hi-score, and bonus man display.
- `Util`: shared collision and helper functions.
- `Data`: static gameplay data such as jump trajectory, level data, and bonus-man colors.

The main Phaser globals created in `main.js` are:

- `game`
- `map`
- `layer`
- `keyPressed`
- `vanishingPlatformGroup`

These globals are still used directly by multiple files.

## Game states

Game states are centralized in `js/gameStates.js`.

The string values are intentionally kept stable because they are part of the current runtime flow.

Important states include:

```js
GameStates.LOAD_INTRODUCTION
GameStates.INTRODUCTION
GameStates.LOAD_HELP
GameStates.HELP
GameStates.LOAD_LEVEL
GameStates.DISPLAY_LEVEL
GameStates.START_LEVEL
GameStates.DISPLAYING_MONSTERS
GameStates.PLAYING
GameStates.END_LEVEL
GameStates.END_GAME
GameStates.SHOW_GAME_OVER
GameStates.GAME_OVER
```

The current lifecycle is approximately:

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

`main.js` creates the Phaser game instance:

```js
var game = new Phaser.Game(640, 400, Phaser.AUTO, '', {
    preload: preload,
    create: create,
    update: updateGame
});
```

Every frame, Phaser calls:

```text
updateGame()
  -> GameController.update()
```

`GameController.update()` dispatches to one method per game state.

During normal gameplay, the update order is:

```text
HUD.updateAirLevel()
HUD.displayBonusMan()
Level.updateMonsters()
Player.update()
```

This order is part of the current gameplay behavior and should be changed only with care.

## `js/main.js`

Main responsibilities:

- create the Phaser instance;
- load all assets in `preload()`;
- create the Tiled map and main layer in `create()`;
- initialize Arcade Physics;
- create animated tile sprites where needed;
- create and initialize the player;
- initialize the monster group;
- initialize the HUD;
- create the black rectangles used by screen and reveal sequences;
- set the initial game state;
- delegate each frame to `GameController.update()`.

Important globals created here:

```text
game
map
layer
keyPressed
vanishingPlatformGroup
```

These are still part of the current architecture and should be treated as shared runtime context.

## `js/gameController.js`

`GameController` is the high-level state orchestrator.

Main data:

- `gameState`
- `score`
- `hiScore`
- `lives`

Main update methods:

- `updateLoadIntroduction()`
- `updateIntroduction()`
- `updateLoadHelp()`
- `updateHelp()`
- `updateLoadLevel()`
- `updateDisplayLevel()`
- `updateStartLevel()`
- `updateDisplayingMonsters()`
- `updatePlaying()`
- `updateEndLevel()`
- `updateEndGame()`
- `updateShowGameOver()`
- `updateGameOver()`

`GameController` does not directly implement most visual sequences. It delegates them to specialized objects:

- title/help/game-over screens: `ScreenManager`;
- level reveal: `LevelRevealSequence`;
- end-of-level transition: `LevelTransition`;
- final congratulations sequence: `EndGameSequence`.

## `js/screenManager.js`

`ScreenManager` handles screens that are not normal gameplay screens.

Responsibilities:

- display the title screen;
- remove the title screen;
- display the help/instructions screen;
- display the game-over logo;
- remove the game-over logo.

The help screen owns a temporary keyboard callback: pressing any key removes the help text, clears the black background, and returns to the introduction flow.

`ScreenManager` uses the shared black rectangle created by `LevelRevealSequence` as a full-screen background when needed.

## `js/level.js`

`Level` is responsible for the current level and level-related runtime data.

Main responsibilities:

- keep track of the current level number;
- reset level-specific data;
- orchestrate current-level loading;
- position the player at the current level start through `Player.reset()`;
- keep the current monster list and update monster movement;
- manage the monster reveal sequence;
- keep the invisible level-exit sprite reference;
- create explosion and reverse-explosion groups;
- reset the whole game when needed.

Important data:

- `level`
- `airLevel`
- `keysTaken`
- `bonusMan`
- `monsters`
- `monstersGroup`
- `endLevel`
- `animationCounterMax`
- `animationCounter`

`Level` still exposes some compatibility-style methods that delegate to more specialized objects:

```js
Level.display()      // delegates to LevelRevealSequence.update()
Level.goToNext()     // delegates to LevelTransition.update()
```

`Level.load()` is the central method for loading a level. It:

1. resets air, collected keys, and bonus man state;
2. resets the player;
3. asks `LevelObjectLoader` to create the current level monsters;
4. asks `LevelObjectLoader` to create or reposition the invisible exit sprite.

`Level.resetGame()` updates the hi-score when necessary and resets score, lives, level number, air, keys, and bonus-man state.

## `js/levelObjectLoader.js`

`LevelObjectLoader` isolates Tiled object lookup and Phaser sprite creation for objects that belong to a level.

Responsibilities:

- find monster objects for the current level in the Tiled `monsters` object layer;
- destroy old monster sprites when a level is reloaded;
- create `Monster` instances and add their sprites to `Level.monstersGroup`;
- hide monster sprites until the monster reveal animation finishes;
- find the current level exit object in the Tiled `end level` object layer;
- create or reposition the invisible exit sprite used by player/exit collision checks.

This object does not own gameplay state. It returns created objects to `Level`, which remains the runtime owner of `monsters` and `endLevel`.

## `js/levelRevealSequence.js`

`LevelRevealSequence` handles the progressive reveal shown when a level starts.

Responsibilities:

- create the two black rectangles used to hide the playfield;
- progressively move those rectangles away;
- switch the game state to `GameStates.START_LEVEL` when the level has been revealed.

Main data:

- `upperBlackRectangle`
- `lowerBlackRectangle`
- `phase`
- `counter`
- `rectangleHeight`
- `rectangleWidth`

The same upper rectangle is also reused as a black background by some non-gameplay screens. This is a legacy-style shared object, but it keeps the current rendering simple.

## `js/levelTransition.js`

`LevelTransition` handles the transition after a level has been completed.

It is a small frame-by-frame state machine.

Current phases:

1. prepare the next level;
2. hide the monsters from the completed level;
3. restore the gray background;
4. precisely align the player on one axis;
5. convert the remaining air into score;
6. move the player toward the next level start position;
7. refill the air bar;
8. load the next level and continue with the next level start sequence.

Important behavior:

- remaining air is converted into score;
- the player is moved visibly between the old and new level positions;
- the air bar is refilled before gameplay resumes;
- `Level.bonusMan` is enabled for the next level.

The transition uses existing coordinate conventions between Tiled and Phaser, especially the player vertical offset.

## `js/endGameSequence.js`

`EndGameSequence` handles the final congratulations sequence after the last level.

It is a frame-by-frame state machine updated while the game state is `GameStates.END_GAME`.

Current phases:

1. convert the remaining air into score;
2. display the congratulations message;
3. scale the message up;
4. wait briefly;
5. reset the game and return to the introduction screen.

The final message text is stored in `LevelConstants.END_GAME_MESSAGE_TEXT`.

## `js/player.js`

`Player` is responsible for the playable character.

Responsibilities:

- create the normal player sprite;
- reset the player at the beginning of a level;
- read keyboard input;
- handle horizontal movement;
- handle jumping;
- handle falling;
- detect deadly falls;
- handle conveyor belts;
- handle slippery platforms;
- handle ladders;
- delegate key collection, deadly collision checks, and exit detection to `PlayerInteractions`;
- trigger the death sequence through `PlayerDeathSequence`.

Important data:

- `jumping`
- `jumpIndex`
- `jumpingDirection`
- `fallHeight`
- `fallLimit`
- `deadlyFall`
- `playerSprite`
- `playerDyingSprite`

The player is not yet implemented as a formal state machine. Jumping, falling, deadly falls, and death are still controlled by booleans and counters.

The jump trajectory comes from:

```js
Data.jumpPath
```

This data-driven jump path is very sensitive to gameplay feel and should not be rewritten casually.

Key collection and exit behavior are implemented in `PlayerInteractions`, while the death animation and post-death consequences are handled by `PlayerDeathSequence`. `Player` remains responsible for movement and for triggering death when needed.

## `js/playerInteractions.js`

`PlayerInteractions` handles gameplay interactions that are triggered by the player position but are not movement rules.

Responsibilities:

- detect key collection;
- update `Level.keysTaken`;
- increase and redraw the score after a key is collected;
- hide collected key tiles;
- detect deadly tiles and monster collisions;
- trigger `Player.kill()` when needed;
- detect the level exit once all keys have been collected;
- switch to `GameStates.END_LEVEL` or `GameStates.END_GAME`.

`Player.update()` passes the player coordinates captured at the beginning of the frame to `PlayerInteractions`. This is intentional: the original implementation performed these checks using those same coordinates after applying movement for the frame. Keeping this convention avoids subtle changes in collision timing.

## `js/playerDeathSequence.js`

`PlayerDeathSequence` handles the death animation and the consequences that happen after the animation completes.

Responsibilities:

- stop normal gameplay by switching to `GameStates.KILL_PLAYER`;
- hide the normal player sprite;
- create the separate death-animation sprite;
- use the white death sprite after a deadly fall;
- consume the bonus man when available;
- otherwise remove one life;
- reset the air bar after death;
- reload the current level or show the game-over screen.

`Player.kill()` is now a small delegation method:

```js
PlayerDeathSequence.start(Player)
```

This keeps movement code in `Player` and death sequencing in one dedicated object.

## `js/playerStates.js`

`PlayerStates` centralizes player-related runtime constants.

It includes:

- movement directions;
- animation names;
- player sprite keys;
- death animation timing values.

Despite the name, it is not a complete player state machine. It is currently a constants holder.

Examples:

```js
PlayerStates.LEFT
PlayerStates.RIGHT
PlayerStates.UP
PlayerStates.DOWN
PlayerStates.ANIMATION_LEFT
PlayerStates.ANIMATION_RIGHT
PlayerStates.SPRITE_BLAGGER
PlayerStates.SPRITE_BLAGGER_DYING
PlayerStates.ANIMATION_BLAGGER_DYING
```

## `js/monster.js`

`Monster` is a constructor function for enemy instances.

Each monster is created from a Tiled object and from collision properties stored in the monster tileset.

Responsibilities:

- create the monster sprite;
- read its initial direction;
- read its maximum movement distance;
- store its real hitbox;
- move horizontally or vertically;
- reverse direction when the maximum distance is reached.

Monsters do not chase the player. They follow predefined paths.

Collision with the player is tested in:

```js
Util.collisionRectangleWithMonsters()
```

## `js/monsterConstants.js`

`MonsterConstants` centralizes monster-related constants.

It includes:

- direction values used by Tiled and monster movement;
- Tiled property names used by monster objects;
- default monster speed;
- monster animation name;
- animation frames and frame rate;
- vertical Tiled-to-Phaser offset.

Examples:

```js
MonsterConstants.DIRECTION_RIGHT
MonsterConstants.DIRECTION_LEFT
MonsterConstants.DIRECTION_DOWN
MonsterConstants.DIRECTION_UP
MonsterConstants.PROPERTY_MAX_DISTANCE
MonsterConstants.DEFAULT_SPEED
MonsterConstants.ANIMATION_DEFAULT
```

The direction strings must remain compatible with the values stored in the Tiled map.

## `js/HUD.js`

`HUD` handles the display and update of the lower status area.

Responsibilities:

- create the black HUD area below the playfield;
- display the air bar;
- display lives;
- display the score;
- display the current level number;
- display the hi-score;
- display and animate the bonus man;
- decrease the air level during gameplay.

Important methods:

```js
HUD.update()
HUD.updateAirLevel()
HUD.displayBonusMan()
```

If the air reaches zero during gameplay, `HUD.updateAirLevel()` kills the player through:

```js
Player.kill()
```

The active level number display is refreshed by `HUD.update()` using `Level.level`.

## `js/hudConstants.js`

`HudConstants` centralizes HUD-related constants.

It includes:

- text labels;
- text positions;
- colors;
- digit formatting values;
- air bar layout;
- air depletion timing;
- bonus man display timing;
- retro font configuration.

Examples:

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

## `js/levelConstants.js`

`LevelConstants` centralizes level, Tiled, score, screen, transition, and sequence constants.

It includes:

- initial level/lives/air values;
- Tiled layer and property names;
- common tile names and tile types;
- score increments;
- key tile index;
- player and level-exit coordinate offsets;
- level reveal values;
- end-of-level transition values;
- end-game sequence values;
- screen positions and text values shared by screen-related objects.

Examples:

```js
LevelConstants.DEFAULT_AIR_LEVEL
LevelConstants.TILED_PROPERTY_LEVEL
LevelConstants.OBJECT_LAYER_PLAYER
LevelConstants.OBJECT_LAYER_MONSTERS
LevelConstants.OBJECT_LAYER_END_LEVEL
LevelConstants.TILE_NAME_KEY
LevelConstants.TILE_TYPE_SOLID
LevelConstants.TILE_KEY_INDEX
LevelConstants.END_LEVEL_Y_OFFSET
LevelConstants.END_GAME_SCORE_INCREMENT
LevelConstants.END_GAME_MESSAGE_TEXT
```

The values that mirror the Tiled map must remain synchronized with the map data.

## `js/util.js`

`Util` contains shared helper functions.

Main responsibilities:

- test collisions along horizontal and vertical lines;
- test collisions around rectangle edges;
- test collision with the level exit;
- test collision with monsters;
- test disappearing platforms;
- create animated sprites from tile definitions;
- find Tiled objects by property;
- retrieve monster tile properties;
- draw text using the game font.

Most player and interaction collision checks depend on this file, so it is gameplay-critical.

## `js/data.js`

`Data` contains static gameplay data.

Main contents:

- `jumpPath`: per-frame jump trajectory data;
- `levels`: key count and monster animation speed per level;
- `bonusManColors`: colors used to animate the bonus man.

The required number of keys for the current level is read through:

```js
Data.levels[Level.level - 1][0]
```

## Level loading flow

Level loading is mainly handled by:

```js
Level.load()
```

Simplified flow:

```text
Level.load()
  -> reset level data
  -> Player.reset()
  -> Level.addMonsters()
      -> LevelObjectLoader.loadMonsters()
  -> LevelObjectLoader.loadEndLevel()
  -> HUD.update()
```

After loading, the level is revealed by `LevelRevealSequence`, then monsters are revealed by `Level.displayMonsters()`, and gameplay begins.

## Level start flow

```text
GameStates.LOAD_LEVEL
  -> Level.load()
  -> HUD.update()
  -> GameStates.DISPLAY_LEVEL
      -> LevelRevealSequence.update()
      -> GameStates.START_LEVEL
          -> Level.displayMonsters()
          -> GameStates.PLAYING
```

## Normal gameplay flow

During `GameStates.PLAYING`:

```text
HUD.updateAirLevel()
HUD.displayBonusMan()
Level.updateMonsters()
Player.update()
```

`Player.update()` delegates movement to `PlayerMovement` and gameplay interaction checks to `PlayerInteractions`.

## End-of-level flow

When all keys have been collected and the player touches the exit:

```text
Player.update()
  -> PlayerInteractions.exitLevelIfNeeded()
  -> GameController.gameState = GameStates.END_LEVEL
```

Then:

```text
GameController.updateEndLevel()
  -> Level.goToNext()
      -> LevelTransition.update()
```

The transition moves the player toward the next level start, converts remaining air into score, refills the air, and starts the next level.

## End-game flow

When the last level has been completed:

```text
Player.update()
  -> PlayerInteractions.exitLevelIfNeeded()
  -> GameController.gameState = GameStates.END_GAME
```

Then:

```text
GameController.updateEndGame()
  -> EndGameSequence.update()
```

The sequence converts remaining air into score, displays the congratulations message, scales it up, waits briefly, resets the game, and returns to the title screen.

## Player death flow

Player death can be caused by:

- collision with a deadly tile;
- collision with a monster;
- deadly fall;
- depleted air.

Death is triggered through:

```js
Player.kill()
```

`Player.kill()` delegates to `PlayerDeathSequence.start()`.

Simplified flow:

```text
Player.kill()
  -> PlayerDeathSequence.start()
      -> stop normal gameplay
      -> hide normal player sprite
      -> show death sprite
      -> play death animation
      -> remove one life or consume bonus man
      -> reset the air bar
      -> reload level or show game over
```

## Hi-score flow

The hi-score is read from `localStorage` during startup:

```js
localStorage.getItem('hiScore')
```

It is updated in `Level.resetGame()` if the current score is greater than the stored hi-score.

## Tiled map conventions

The game depends on conventions defined in the Tiled map and tilesets.

Important object layers and properties include:

- player object layer;
- monster object layer;
- end-level object layer;
- `level` property;
- monster `direction` property;
- monster `maxDistance` property;
- tile `name` property;
- tile `type` property.

Important tile concepts include:

- solid tiles;
- ladders;
- keys;
- deadly tiles;
- slippery platforms;
- conveyor belts;
- disappearing platforms;
- monster collision rectangles.

These conventions are partly represented by `LevelConstants` and `MonsterConstants`, but the Tiled data remains the source of truth.

## Technical points to watch

### Global state

The project still relies heavily on global objects and variables. This is workable for the current codebase, but it is the main architectural limitation before a future migration to TypeScript or a modern Phaser scene structure.

### Script order

Because there is no module system, `index.html` load order is part of the architecture. Adding a new global object usually requires adding a new `<script>` tag at the correct position.

### Manual collisions

Collision code is very specific to this game. Many checks are based on pixel probes and tile properties. Small changes can affect the feel of movement, jumping, ladders, falling, key collection, exit detection, and enemy collision.

### Counter-based sequences

Several sequences are still frame/counter based. They are readable now, but still depend on preserved timings and numeric thresholds.

Important examples:

- level reveal;
- monster reveal;
- end-of-level transition;
- end-game sequence;
- HUD air depletion;
- bonus man color animation.

### Tiled coupling

A lot of behavior depends on exact Tiled layer names, object names, tile names, and property names. Changing the map without updating constants and code can break gameplay.

### Player logic sensitivity

The player is the most sensitive part of the game. The jump trajectory, fall detection, ladder handling, and tile collision probes should be refactored only in small, well-tested steps.

## Possible future improvements

The following improvements are architectural ideas, not current implementation details.

### Document Tiled conventions separately

A dedicated document such as `doc/tiled_map_conventions.md` would be useful. It could describe every expected layer, object type, tile property, monster property, and coordinate offset.

### Add an explicit debug mode

A debug mode would be useful for testing transitions and levels. It should not be active by default in production. A safe approach would be to enable it only through an explicit URL parameter such as:

```text
?debug=1
```

### Reduce global variables

A future architecture could group shared runtime objects into a context object, then later move toward ES modules or Phaser scenes.

### Prepare TypeScript gradually

Before moving to TypeScript, it would be useful to document the shape of:

- Tiled objects;
- tile properties;
- monster definitions;
- player state;
- level data;
- game states.

### Separate gameplay rules from Phaser calls

Some gameplay rules could eventually be made less dependent on Phaser objects. This would make the code easier to test and easier to migrate to a newer Phaser version.

## Manual test checklist

After any small architecture change, test at least:

- game launch;
- title screen;
- help screen with `h`;
- return from help;
- level 1 loading;
- level reveal;
- monster reveal;
- left/right movement;
- jump;
- fall;
- ladders;
- key collection;
- collision with an enemy or a trap;
- losing a life;
- transition to the next level;
- score, lives, level number, hi-score, and air display;
- game-over screen;
- no red JavaScript error in the browser console.

To quickly test the transition to the next level from the browser console:

```js
Level.keysTaken = Data.levels[Level.level - 1][0];
GameController.gameState = GameStates.END_LEVEL;
```

This command must not be turned into a keyboard shortcut that is active in production. If a debug system is added later, it should be explicitly enabled.
