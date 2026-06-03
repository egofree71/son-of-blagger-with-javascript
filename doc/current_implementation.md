# Son of Blagger — Current Implementation

This document describes the current architecture of the TypeScript / Phaser remake of **Son of Blagger**.

Its purpose is to help someone understand the project as it exists today: the runtime structure, the ES module graph, the remaining Phaser runtime globals, the gameplay flow, the responsibilities of each file, and the technical points to watch before making further changes.

It is not a changelog. Historical refactoring steps are intentionally not listed here.

## Project goal

This project is a web remake of the Commodore 64 game **Son of Blagger**.

The player controls Slippery Sid through maze-like levels. The goal is to collect all keys in the current level, avoid enemies and traps, then reach the exit to move on to the next level.

The current engineering goal is still to keep the original gameplay behavior intact while gradually making the code easier to maintain, understand, and eventually modernize.

## Technical overview

- Engine: **Phaser 2.3.0**.
- Language: **TypeScript**.
- Development/build tool: **Vite**.
- Type checking: `tsc --noEmit` through `npm run typecheck`.
- Module system: Vite ES module entry point. Runtime files use explicit ES module exports/imports.
- Main architecture style: TypeScript ES modules with several class-based runtime singletons and a small legacy Phaser runtime context kept on `window`.
- Map format: Tiled JSON map loaded by Phaser.
- Rendering: Phaser sprites, Phaser tilemap layers, generated bitmap-style text.
- Physics: Phaser Arcade Physics is enabled, but many gameplay collisions are still handled manually through tile and rectangle checks.
- Persistence: the hi-score is stored in `localStorage`.

The codebase is now TypeScript-based, but it still deliberately keeps Phaser 2.3 loaded as a classic browser script from `public/js/phaser.min.js`. Phaser itself is therefore still accessed through the global `Phaser` object rather than imported from npm.

The internal game files live under `src/js` and are imported through `src/js/main.ts`, which is loaded from the Vite entry point `src/main.ts`.

Most runtime objects are exported as named ES module values. Some of them are now class-based singletons, for example `GameController`, `ScreenManager`, `Level`, `Player`, `HUD`, `LevelRevealSequence`, `LevelTransition`, `EndGameSequence`, and `PlayerDeathSequence`.

This class-based structure is intentionally conservative: it keeps the public API mostly compatible with the previous object-literal architecture. Many fields are still public because other modules still read or mutate them directly. This means the project is not yet fully encapsulated in the object-oriented sense. A future refactoring step can progressively replace direct field access with getters and behavior-focused methods.

The remaining Phaser runtime globals are created in `src/js/main.ts` and `src/js/gameInitializer.ts` and declared for TypeScript in `src/types/globals.d.ts`:

- `game`
- `map`
- `layer`
- `keyPressed`
- `vanishingPlatformGroup`

These globals are still used directly by multiple files.

## Running the game locally

Install dependencies once from the project root:

```powershell
npm install
```

Then start the Vite development server:

```powershell
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

The old `py -m http.server 8000` workflow is no longer the preferred way to run the project. Vite provides the local development server and can also build a production version of the game with `npm run build`.

## Type checking

To run TypeScript type checking:

```powershell
npm run typecheck
```

The current TypeScript setup is still intentionally permissive. Phaser 2.3 and several legacy runtime objects are declared with loose `any` types so that the migration can remain incremental.

## Building the game

To create a production build:

```powershell
npm run build
```

This creates a generated `dist/` folder. It should not be edited by hand.

To preview that production build locally:

```powershell
npm run preview
```

## Deployment to GitHub Pages

The production site is deployed through GitHub Actions.

The workflow lives in:

```text
.github/workflows/deploy.yml
```

On each push to `master`, GitHub Actions installs dependencies with `npm ci`, runs `npm run build`, uploads the generated `dist/` folder as a GitHub Pages artifact, and deploys that artifact to GitHub Pages.

The repository Pages setting should use:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

The generated `dist/` folder is build output and should not be edited by hand or committed.

## Project structure

The current Vite-based layout is:

```text
index.html
package.json
package-lock.json
tsconfig.json
vite.config.js
src/
 main.ts
 js/
  ...game runtime modules...
 types/
  globals.d.ts
public/
 js/
  phaser.min.js
 assets/
  maps/
  sprites/
  tileset/
doc/
 current_implementation.md
```

`public/` is still used for files that must be copied unchanged to the production `dist/` folder. This currently includes Phaser 2.3 and all Phaser-loaded game assets.

The game source files themselves now live in `src/js` and are imported by Vite through `src/main.ts`.

If an old `src/main.js` file is still present from a previous refactoring step, it is obsolete. The active Vite entry point is `src/main.ts`.

## File loading order

`index.html` loads Phaser 2.3 as a classic script and then loads the Vite TypeScript entry point:

```html
<script src="./js/phaser.min.js"></script>
<script type="module" src="/src/main.ts"></script>
```

Phaser 2.3 is still loaded as a classic browser script because the current game code expects the global `Phaser` object. All other game files are imported through TypeScript ES modules starting from `src/main.ts`.

Runtime file order is now handled by ES module imports. New dependencies should be imported explicitly by the files that use them.

## Main runtime objects

The project is organized around ES module exports defined under `src/js`.

### Class-based singleton runtime objects

The following runtime objects are implemented as internal classes with one exported singleton instance:

- `GameController`: high-level game state orchestration.
- `ScreenManager`: title, help, and game-over screens.
- `Level`: current level data, level loading orchestration, monsters, exit object, and level reset logic.
- `LevelRevealSequence`: frame-by-frame reveal of the level at the beginning of each stage.
- `LevelTransition`: transition between two levels after all keys have been collected.
- `EndGameSequence`: final congratulations sequence.
- `Player`: player sprite creation/reset, update delegation, animation stepping, and death triggering.
- `PlayerDeathSequence`: death animation, bonus-man/life handling, level reload or game-over decision.
- `HUD`: air bar, lives, score, level number, hi-score, and bonus man display.

The exported names are still singleton values:

```ts
export const Level = new LevelController();
export const Player = new PlayerController();
export const HUD = new HUDController();
```

This keeps usage stable:

```ts
Level.load();
Player.update();
HUD.updateAirLevel();
```

The class conversion is mainly structural for now. It improves internal organization and allows private helper methods or private fields where safe, but it does not yet fully hide all runtime state.

### Other runtime modules

The following modules still use object-literal or service-style exports:

- `AssetLoader`: Phaser asset preloading.
- `GameInitializer`: runtime startup after asset loading.
- `LevelObjectLoader`: Tiled object lookup and Phaser sprite creation for level-owned objects.
- `PlayerMovement`: keyboard input and movement rules for the player.
- `PlayerInteractions`: key collection, deadly collision checks, and exit detection for the player.
- `CollisionDetector`: manual tile, rectangle, monster, and exit collision checks.
- `Util`: shared non-collision helper functions.
- `Data`: static gameplay data such as jump trajectory, level data, and bonus-man colors.

### Normal classes

`Monster` is a TypeScript class. It is not a singleton: one `Monster` instance is created for each enemy object loaded from the Tiled map.

### Constants and typed data

The constants modules are TypeScript files and use `as const` where useful:

- `GameStates`
- `PlayerStates`
- `MonsterConstants`
- `LevelConstants`
- `HudConstants`

Some files also export derived TypeScript types, for example state or direction unions. These types exist only at compile time and do not change the generated runtime JavaScript.

## Game states

`GameStates` is defined in `src/js/gameStates.ts` and exported as an ES module. Files that use game states import it explicitly.

The string values are intentionally kept stable because they are part of the current runtime flow.

Important states include:

```ts
GameStates.LOAD_INTRODUCTION
GameStates.INTRODUCTION
GameStates.LOAD_HELP
GameStates.HELP
GameStates.LOAD_LEVEL
GameStates.DISPLAY_LEVEL
GameStates.START_LEVEL
GameStates.DISPLAYING_MONSTERS
GameStates.PLAYING
GameStates.KILL_PLAYER
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
             -> KILL_PLAYER -> LOAD_LEVEL or SHOW_GAME_OVER
             -> END_LEVEL -> START_LEVEL of next level
             -> END_GAME -> LOAD_INTRODUCTION
             -> SHOW_GAME_OVER -> GAME_OVER -> LOAD_INTRODUCTION
```

## Main game loop

`src/js/main.ts` creates the Phaser game instance:

```ts
game = new Phaser.Game(640, 400, Phaser.AUTO, '', {
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

## `src/main.ts`

This is the Vite module entry point referenced by `index.html`.

It imports `src/js/main.ts`, which creates the Phaser game instance and pulls in the rest of the runtime through normal ES module imports.

This file does not contain gameplay logic. Its role is to connect Vite's module graph to the current Phaser 2.3 runtime.

## `src/types/globals.d.ts`

This file declares the legacy global runtime objects for TypeScript.

It currently declares Phaser itself loosely:

```ts
declare const Phaser: any;
```

It also declares global variables such as:

```ts
declare var game: any;
declare var map: any;
declare var layer: any;
declare var keyPressed: any;
declare var vanishingPlatformGroup: any;
```

This is intentionally pragmatic. The project still uses Phaser 2.3 as a browser global, and a complete Phaser 2 type model would add noise before the larger architecture is ready for it.

## `src/js/assetLoader.ts`

`AssetLoader` centralizes Phaser asset preloading.

Responsibilities:

- load the Tiled JSON map;
- load tile set images;
- load player sprites;
- load monster sprites;
- load visual effect sprites;
- load HUD and screen sprites;
- load animated tile sprites;
- load the bitmap font image.

The asset keys and sprite dimensions are part of the current runtime contract. Other files still refer to those keys directly, so they should be renamed only with care.

## `src/js/main.ts`

`main.ts` owns the Phaser lifecycle entry points and the shared Phaser globals.

Main responsibilities:

- create the Phaser instance;
- delegate asset preloading to `AssetLoader`;
- delegate runtime startup to `GameInitializer`;
- delegate each frame to `GameController.update()`.

Important globals created here or during initialization:

```text
game
map
layer
keyPressed
vanishingPlatformGroup
```

These are still part of the current architecture and should be treated as shared runtime context.

## `src/js/gameInitializer.ts`

`GameInitializer` owns the runtime startup sequence executed from Phaser's `create()` callback.

Main responsibilities:

- configure Phaser scaling and page alignment;
- start Arcade Physics;
- create the Tiled map and main layer;
- create animated tile sprites where needed;
- initialize runtime groups;
- create and initialize the player and monster support groups;
- create cursor-key input;
- load the hi-score from `localStorage`;
- initialize the HUD;
- create the black rectangles used by screen and reveal sequences;
- set the initial game state.

`GameInitializer` is still a service-style module rather than a class-based singleton. It mainly performs startup wiring and does not currently need its own runtime identity.

## `src/js/gameController.ts`

`GameController` is the high-level state orchestrator.

It is implemented as a class-based singleton:

```ts
export const GameController = new GameControllerController();
```

Main public data:

- `gameState`
- `score`
- `hiScore`
- `lives`

Main update methods:

- `update()`

The state-specific update methods are internal implementation details of the controller. They dispatch the current frame to the correct subsystem according to `gameState`.

`GameController` does not directly implement most visual sequences. It delegates them to specialized objects:

- title/help/game-over screens: `ScreenManager`;
- level reveal: `LevelRevealSequence`;
- end-of-level transition: `LevelTransition`;
- final congratulations sequence: `EndGameSequence`;
- normal gameplay: `HUD`, `Level`, and `Player`.

Important architectural note: other modules still write to `GameController.gameState` directly. This is a remaining global-style dependency and a good candidate for future encapsulation.

## `src/js/screenManager.ts`

`ScreenManager` handles screens that are not normal gameplay screens.

It is implemented as a class-based singleton:

```ts
export const ScreenManager = new ScreenManagerController();
```

Responsibilities:

- display the title screen;
- remove the title screen;
- display the help/instructions screen;
- display the game-over logo;
- remove the game-over logo.

The help screen owns a temporary keyboard callback: pressing any key removes the help text, clears the black background, and returns to the introduction flow.

`ScreenManager` uses the shared black rectangle created by `LevelRevealSequence` as a full-screen background when needed.

The screen sprites themselves are internal to `ScreenManager` and should not be manipulated by other modules.

## `src/js/level.ts`

`Level` is responsible for the current level and level-related runtime data.

It is implemented as a class-based singleton:

```ts
export const Level = new LevelController();
```

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

Important public data:

- `level`
- `airLevel`
- `keysTaken`
- `bonusMan`
- `monsters`
- `monstersGroup`
- `endLevel`
- `animationCounterMax`
- `animationCounter`
- `explosions`
- `reverseExplosions`

`Level` still exposes compatibility-style methods that delegate to more specialized objects:

```ts
Level.display();   // delegates to LevelRevealSequence.update()
Level.goToNext();  // delegates to LevelTransition.update()
```

`Level.load()` is the central method for loading a level. It:

1. resets air, collected keys, and bonus man state;
2. resets the player;
3. asks `LevelObjectLoader` to create the current level monsters;
4. asks `LevelObjectLoader` to create or reposition the invisible exit sprite.

`Level.resetGame()` updates the hi-score when necessary and resets score, lives, level number, air, keys, and bonus-man state.

Important architectural note: many other modules still read and write `Level` fields directly, especially `level`, `airLevel`, `keysTaken`, and `bonusMan`. These fields are good candidates for future encapsulation.

## `src/js/levelObjectLoader.ts`

`LevelObjectLoader` isolates Tiled object lookup and Phaser sprite creation for objects that belong to a level.

Responsibilities:

- find monster objects for the current level in the Tiled `monsters` object layer;
- destroy old monster sprites when a level is reloaded;
- create `Monster` instances and add their sprites to `Level.monstersGroup`;
- hide monster sprites until the monster reveal animation finishes;
- find the current level exit object in the Tiled `end level` object layer;
- create or reposition the invisible exit sprite used by player/exit collision checks.

This object does not own gameplay state. It returns created objects to `Level`, which remains the runtime owner of `monsters` and `endLevel`.

## `src/js/levelRevealSequence.ts`

`LevelRevealSequence` handles the progressive reveal shown when a level starts.

It is implemented as a class-based singleton:

```ts
export const LevelRevealSequence = new LevelRevealSequenceController();
```

Responsibilities:

- create the two black rectangles used to hide the playfield;
- progressively move those rectangles away;
- switch the game state to `GameStates.START_LEVEL` when the level has been revealed.

Main public data:

- `upperBlackRectangle`
- `lowerBlackRectangle`

Main internal data:

- phase;
- counter;
- rectangle dimensions.

The same upper rectangle is also reused as a black background by some non-gameplay screens. This is a legacy-style shared object, but it keeps the current rendering simple.

## `src/js/levelTransition.ts`

`LevelTransition` handles the transition after a level has been completed.

It is implemented as a class-based singleton:

```ts
export const LevelTransition = new LevelTransitionController();
```

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

## `src/js/endGameSequence.ts`

`EndGameSequence` handles the final congratulations sequence after the last level.

It is implemented as a class-based singleton:

```ts
export const EndGameSequence = new EndGameSequenceController();
```

It is a frame-by-frame state machine updated while the game state is `GameStates.END_GAME`.

Current phases:

1. convert the remaining air into score;
2. display the congratulations message;
3. scale the message up;
4. wait briefly;
5. reset the game and return to the introduction screen.

The final message text is stored in `LevelConstants.END_GAME_MESSAGE_TEXT`.

## `src/js/player.ts`

`Player` owns the playable character sprite and the small amount of runtime state that still belongs directly to the character.

It is implemented as a class-based singleton:

```ts
export const Player = new PlayerController();
```

Responsibilities:

- create the normal player sprite;
- reset the player at the beginning of a level;
- delegate movement rules to `PlayerMovement`;
- delegate key collection, deadly collision checks, and exit detection to `PlayerInteractions`;
- advance left/right animation frames;
- trigger the death sequence through `PlayerDeathSequence`.

Important public data:

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

```ts
Data.jumpPath
```

This data-driven jump path is very sensitive to gameplay feel and should not be rewritten casually.

Movement rules are implemented in `PlayerMovement`, key collection and exit behavior are implemented in `PlayerInteractions`, and the death animation plus post-death consequences are handled by `PlayerDeathSequence`. `Player` remains the central object that owns the character sprite and delegates to these helpers.

## `src/js/playerMovement.ts`

`PlayerMovement` handles frame-by-frame movement rules for the player.

Responsibilities:

- read keyboard input;
- handle horizontal movement;
- handle jumping and falling;
- detect deadly falls;
- apply conveyor belts and slippery platforms;
- handle ladders;
- block movement against walls and ceilings.

Most movement checks use manual pixel probes through `CollisionDetector`. The hard-coded offsets in this file are gameplay-sensitive and define much of the platforming feel.

`PlayerMovement` is still service-style rather than class-based. This is intentional for now: the movement code is gameplay-sensitive, and it should be refactored only in very small steps.

## `src/js/playerInteractions.ts`

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

`PlayerInteractions` delegates manual collision checks to `CollisionDetector`.

`Player.update()` passes the player coordinates captured at the beginning of the frame to `PlayerInteractions`. This is intentional: the original implementation performed these checks using those same coordinates after applying movement for the frame. Keeping this convention avoids subtle changes in collision timing.

## `src/js/playerDeathSequence.ts`

`PlayerDeathSequence` handles the death animation and the consequences that happen after the animation completes.

It is implemented as a class-based singleton:

```ts
export const PlayerDeathSequence = new PlayerDeathSequenceController();
```

Responsibilities:

- stop normal gameplay by switching to `GameStates.KILL_PLAYER`;
- hide the normal player sprite;
- create the separate death-animation sprite;
- use the white death sprite after a deadly fall;
- consume the bonus man when available;
- otherwise remove one life;
- reset the air bar after death;
- reload the current level or show the game-over screen.

`Player.kill()` is a small delegation method:

```ts
PlayerDeathSequence.start(Player);
```

This keeps movement code in `Player` and death sequencing in one dedicated object.

## `src/js/playerStates.ts`

`PlayerStates` centralizes player-related runtime constants.

It includes:

- movement directions;
- animation names;
- player sprite keys;
- death animation timing values.

Despite the name, it is not a complete player state machine. It is currently a constants holder.

Examples:

```ts
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

## `src/js/monster.ts`

`Monster` is a TypeScript class for enemy instances.

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

```ts
CollisionDetector.collisionRectangleWithMonsters()
```

## `src/js/monsterConstants.ts`

`MonsterConstants` centralizes monster-related constants.

It includes:

- direction values used by Tiled and monster movement;
- Tiled property names used by monster objects;
- default monster speed;
- monster animation name;
- animation frames and frame rate;
- vertical Tiled-to-Phaser offset.

Examples:

```ts
MonsterConstants.DIRECTION_RIGHT
MonsterConstants.DIRECTION_LEFT
MonsterConstants.DIRECTION_DOWN
MonsterConstants.DIRECTION_UP
MonsterConstants.PROPERTY_MAX_DISTANCE
MonsterConstants.DEFAULT_SPEED
MonsterConstants.ANIMATION_DEFAULT
```

The direction strings must remain compatible with the values stored in the Tiled map.

## `src/js/HUD.ts`

`HUD` handles the display and update of the lower status area.

It is implemented as a class-based singleton:

```ts
export const HUD = new HUDController();
```

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

```ts
HUD.update();
HUD.updateAirLevel();
HUD.displayBonusMan();
```

If the air reaches zero during gameplay, `HUD.updateAirLevel()` kills the player through:

```ts
Player.kill();
```

The active level number display is refreshed by `HUD.update()` using `Level.level`.

## `src/js/hudConstants.ts`

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

```ts
HudConstants.CHAR_WIDTH
HudConstants.AIR_DECREASE_DELAY
HudConstants.BONUS_MAN_COLOR_DELAY
HudConstants.BONUS_MAN_SPRITE_KEY
HudConstants.LABEL_AIR
HudConstants.LABEL_HI_SCORE
HudConstants.COLOR_AIR_BLUE
HudConstants.COLOR_GREY
```

## `src/js/levelConstants.ts`

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

```ts
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

## `src/js/collisionDetector.ts`

`CollisionDetector` contains manual collision checks used by the player and gameplay interactions.

Main responsibilities:

- test collisions along horizontal and vertical tile lines;
- test collisions around rectangle edges;
- test disappearing platforms;
- test collision with the level exit;
- test collision with monsters;
- store `lastTileHit` so collected key tiles can be hidden.

Most player movement and interaction checks depend on this file, so it is gameplay-critical. The algorithms intentionally still scan pixel-by-pixel, matching the previous behavior.

## `src/js/util.ts`

`Util` contains shared non-collision helper functions.

Main responsibilities:

- create animated sprites from tile definitions;
- find Tiled objects by property;
- retrieve monster tile properties;
- draw text using the game font.

Collision checks are handled by `CollisionDetector`.

## `src/js/data.ts`

`Data` contains static gameplay data.

Main contents:

- `jumpPath`: per-frame jump trajectory data;
- `levels`: key count and monster animation speed per level;
- `bonusManColors`: colors used to animate the bonus man.

The required number of keys for the current level is read through:

```ts
Data.levels[Level.level - 1][0]
```

## Level loading flow

Level loading is mainly handled by:

```ts
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
GameController.update()
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
GameController.update()
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

```ts
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

```ts
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

### Class singletons are not full encapsulation yet

Several important runtime objects are now implemented as classes, but most of them are still exported as singleton instances with public fields.

This was intentional to avoid mixing too many architectural changes at once. The code is structurally cleaner than the previous object-literal version, but the architecture is still close to the old global-state model.

Future work should progressively replace direct field manipulation with behavior-focused methods. Examples:

```text
Level.keysTaken++              -> Level.collectKey()
Level.airLevel--               -> Level.decreaseAir()
Level.bonusMan = false         -> Level.consumeBonusMan()
GameController.gameState = ... -> GameController.setState(...)
```

### Global Phaser runtime context

The project no longer exposes core gameplay objects through `window.*` compatibility mirrors. It still relies on a small shared Phaser runtime context created in `src/js/main.ts` and `src/js/gameInitializer.ts`: `game`, `map`, `layer`, `keyPressed`, and `vanishingPlatformGroup`.

This shared context is workable for the current codebase, but it remains the main architectural limitation before a fuller migration to an explicit runtime context or a modern Phaser scene structure.

### TypeScript strictness is still gentle

The project uses TypeScript, but the type system is not yet strict.

Current priorities are:

- preserve gameplay;
- avoid a noisy Phaser 2 typing effort;
- let TypeScript catch module/import/value mistakes;
- prepare the project for later cleanup.

A future step can gradually tighten `tsconfig.json`, starting with `noImplicitAny`, then `strictNullChecks`, then `strict`.

### Script order

Runtime file order is now handled by ES module imports. New dependencies should be imported explicitly by the files that use them.

`src/main.ts` only connects Vite to the Phaser bootstrap in `src/js/main.ts`.

### Manual collisions

Collision code is very specific to this game and is centralized in `CollisionDetector`. Many checks are based on pixel probes and tile properties. Small changes can affect the feel of movement, jumping, ladders, falling, key collection, exit detection, and enemy collision.

### Counter-based sequences

Several sequences are still frame/counter based. They are more structured now, but they still depend on preserved timings and numeric thresholds.

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

### Encapsulate runtime state progressively

The class-singleton migration should be followed by a true encapsulation pass.

Good candidates:

- `Level.level`
- `Level.airLevel`
- `Level.keysTaken`
- `Level.bonusMan`
- `GameController.gameState`
- `GameController.score`
- `GameController.lives`
- `Player.jumping`
- `Player.deadlyFall`

The goal should be to replace direct state changes with methods that express gameplay intent.

### Add explicit debug helpers

A debug mode would be useful for testing transitions and levels. It should not be active by default in production. A safe approach would be to enable it only through an explicit URL parameter such as:

```text
?debug=1
```

This could eventually expose explicit debug helpers such as:

```ts
Level.collectAllKeysForDebug()
GameController.startEndLevelForDebug()
```

This would be cleaner than mutating `Level.keysTaken` and `GameController.gameState` from the browser console.

### Document Tiled conventions separately

A dedicated document such as `doc/tiled_map_conventions.md` would be useful. It could describe every expected layer, object type, tile property, monster property, and coordinate offset.

### Reduce remaining global variables

A future architecture could group shared runtime objects into a context object, then later replace the remaining global Phaser runtime variables with explicit dependencies or Phaser scenes.

### Tighten TypeScript gradually

Once the class-singleton architecture is stable, `tsconfig.json` can be tightened step by step:

1. `noImplicitAny: true`
2. `strictNullChecks: true`
3. `strict: true`

Do not enable everything at once unless the codebase is already clean.

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

To quickly test the transition to the next level from the browser console while running `npm run dev`, import the ES modules explicitly:

```js
const { Level } = await import('/src/js/level.ts');
const { Data } = await import('/src/js/data.ts');
const { GameStates } = await import('/src/js/gameStates.ts');
const { GameController } = await import('/src/js/gameController.ts');

Level.keysTaken = Data.levels[Level.level - 1][0];
GameController.gameState = GameStates.END_LEVEL;
```

This command must not be turned into a keyboard shortcut that is active in production. If a debug system is added later, it should be explicitly enabled.
