# Son of Blagger — Current Implementation

This document describes the current architecture of the TypeScript / Phaser remake of **Son of Blagger**.

Its purpose is to help someone understand the project as it exists today: the Vite runtime structure, the TypeScript ES module graph, the remaining Phaser runtime globals, the game flow, the responsibilities of each file, and the technical points to watch before making further changes.

It is not a changelog. Historical refactoring steps are intentionally not listed here.

---

## Project goal

This project is a web remake of the Commodore 64 game **Son of Blagger**.

The player controls Slippery Sid through maze-like levels. The goal is to collect all keys in the current level, avoid enemies and traps, then reach the exit to move on to the next level.

The engineering goal is to preserve the original gameplay behaviour while making the code easier to maintain, reason about, and eventually modernize further.

---

## Technical overview

- Engine: **Phaser 2.3.0**.
- Language: **TypeScript**.
- Development/build tool: **Vite**.
- Type checking: `tsc --noEmit` through `npm run typecheck`.
- Module system: TypeScript ES modules handled by Vite.
- Main architecture style: TypeScript ES modules, an explicit `Runtime` composition root, class-based runtime controllers, constructor-injected runtime dependencies, and a small legacy Phaser runtime context kept on `window`.
- Map format: Tiled JSON map loaded by Phaser.
- Rendering: Phaser sprites, Phaser tilemap layers, generated bitmap-style text.
- Physics: Phaser Arcade Physics is enabled, but many gameplay collisions are still handled manually through tile and rectangle checks.
- Persistence: the hi-score is stored in `localStorage`.

Phaser 2.3 is still loaded as a classic browser script from `public/js/phaser.min.js`. The current game code expects the global `Phaser` object. Phaser is not imported from npm.

The game source files live under `src/js` and are imported through `src/js/main.ts`, which is loaded from the Vite entry point `src/main.ts`.

The active game runtime now goes through the exported `Runtime` instance from `src/js/gameRuntime.ts`. Runtime controllers such as `GameControllerController`, `LevelController`, `PlayerController`, and `HUDController` are instantiated and wired together there. The older runtime singleton exports such as `GameController`, `Level`, `Player`, and `HUD` have been removed to avoid accidentally driving stale controller instances from modules or browser-console helpers. The most important runtime state in `GameController`, `Level`, and `Player` is private, read through readonly getters, or changed through behaviour-focused methods.

The remaining Phaser runtime globals are created in `src/js/main.ts` and `src/js/gameInitializer.ts`, and declared for TypeScript in `src/types/globals.d.ts`:

- `game`
- `map`
- `layer`
- `keyPressed`
- `vanishingPlatformGroup`

These are still direct global dependencies and remain the main architectural limitation before a fuller migration to an explicit runtime context or a modern Phaser scene architecture.

---

## Running the game locally

Install dependencies once from the project root:

```powershell
npm install
```

Start the Vite development server:

```powershell
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

The old `py -m http.server 8000` workflow is no longer the preferred way to run the project.

---

## Type checking

Run TypeScript type checking with:

```powershell
npm run typecheck
```

The current TypeScript setup is still deliberately permissive. Phaser 2.3 and several legacy runtime objects are declared with loose `any` types so that the migration can remain incremental.

---

## Building the game

Create a production build:

```powershell
npm run build
```

This creates a generated `dist/` folder. It should not be edited by hand.

Preview that production build locally:

```powershell
npm run preview
```

---

## Deployment to GitHub Pages

The production site is deployed through GitHub Actions.

The workflow lives in:

```text
.github/workflows/deploy.yml
```

On each push to `master`, GitHub Actions installs dependencies with `npm ci`, runs `npm run build`, uploads the generated `dist/` folder as a GitHub Pages artifact, and deploys that artifact to GitHub Pages.

The generated `dist/` folder is build output and should not be edited by hand or committed.

---

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

The active Vite entry point is `src/main.ts`. Any old `src/main.js` file is obsolete and should not be kept.

---

## File loading order

`index.html` loads Phaser 2.3 as a classic script and then loads the Vite TypeScript entry point:

```html
<script src="./js/phaser.min.js"></script>
<script type="module" src="/src/main.ts"></script>
```

All game files after Phaser are imported through TypeScript ES modules starting from `src/main.ts`.

---

## Runtime architecture overview

The project is organized around ES module exports defined under `src/js`.

### Runtime controllers and explicit runtime composition

The following runtime objects are implemented as exported controller classes. They are no longer exported as pre-created singleton instances; the active game runtime is composed by `Runtime` in `src/js/gameRuntime.ts`:

- `GameController`: high-level game state orchestration.
- `ScreenManager`: title, help, and game-over screens.
- `ScreenOverlay`: shared fixed-camera black overlay graphics.
- `Level`: current level data, level-owned runtime objects, monsters, exit object, and level reset logic.
- `LevelRevealSequence`: frame-by-frame reveal of the level at the beginning of each stage.
- `LevelTransition`: transition between two levels after all keys have been collected.
- `EndGameSequence`: final congratulations sequence.
- `Player`: playable character sprite, movement state, animation state, and update delegation.
- `PlayerMovement`: keyboard input and movement rules for the player.
- `PlayerInteractions`: key collection, deadly collision checks, and exit detection.
- `PlayerDeathSequence`: visual death animation only.
- `HUD`: status-area display and HUD-specific counters.
- `GameInitializer`: runtime startup after Phaser asset loading.

The controller classes are instantiated explicitly in `GameRuntime`, for example:

```ts
const level = new LevelController();
const hud = new HUDController();
const player = new PlayerController(
    playerMovement,
    playerInteractions,
    playerDeathSequence
);
```

`src/js/gameRuntime.ts` is now the central composition root. It creates the active `Runtime` instance, wires the runtime controllers together, and exposes the Phaser lifecycle façade used by `main.ts`: `Runtime.preload()`, `Runtime.create()`, and `Runtime.update()`. Browser-console helpers should import `Runtime`, not older controller singleton names.

### Service-style modules

The following modules still use object-literal or service-style exports:

- `AssetLoader`: Phaser asset preloading.
- `LevelObjectLoader`: Tiled object lookup and Phaser sprite creation for level-owned objects.
- `CollisionDetector`: generic manual tile/rectangle collision checks.
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

---

## Dependency direction after the runtime dependency refactoring

`GameController` is still the main orchestration hub, but its runtime dependencies are now supplied through its constructor by `GameRuntime`. It imports controller types, not pre-created runtime singleton instances.

Several subsystems were decoupled from each other:

- `HUD` no longer imports `Level`, `Player`, or `GameController`. Runtime values are passed in by callers.
- `PlayerInteractions` no longer imports `HUD`, `GameController`, or `LevelController` directly. It returns a result object and receives a small `PlayerInteractionContext`.
- `PlayerDeathSequence` no longer imports `HUD`, `Level`, or `GameController`. It only runs the visual death animation and invokes a callback when finished.
- `EndGameSequence` no longer imports `HUD`, `Level`, or `GameController`. It returns an `EndGameSequenceResult`.
- `LevelRevealSequence` no longer changes the global game state. It returns `true` when finished.
- `ScreenManager` no longer changes the global game state. It receives callbacks for screen-exit actions.
- `Monster` no longer imports `Level` or `GameController`. `Level` owns the monster animation cadence and passes each monster the information it needs.
- `CollisionDetector` no longer knows about monsters or the level exit. Level-owned collision checks are now handled by `Level`.
- `Level` no longer imports `PlayerController` directly. `Level.load()` receives a small `LevelPlayer` interface.
- `Level` no longer delegates to visual sequence objects such as `LevelRevealSequence`, `LevelTransition`, or `EndGameSequence`.
- `LevelTransition` receives `Level` and `Player` through its constructor. It still coordinates both during the end-of-level transition, because that sequence moves the player, advances level state, converts air, refills air, hides monsters, and loads the next level.
- `Player` receives `PlayerMovement`, `PlayerInteractions`, and `PlayerDeathSequence` through its constructor. This is acceptable because those modules are specialized parts of player behaviour.

Some couplings remain intentionally:

- `GameRuntime` wires together the active runtime graph.
- `GameController` coordinates the injected runtime controllers during the main game flow.
- Phaser globals are still directly accessed by several modules.

The goal is not to create a pure dependency-injection framework. The goal is to reduce the most fragile cross-module dependencies while keeping the retro-game code readable.

---

## Game states

`GameStates` is defined in `src/js/gameStates.ts` and exported as an ES module.

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

External modules should not assign raw states directly. State changes should go through named `GameController` transition methods such as:

```ts
GameController.loadIntroduction();
GameController.loadHelp();
GameController.loadLevel();
GameController.startLevel();
GameController.startPlaying();
GameController.endLevel();
GameController.endGame();
GameController.killPlayer();
GameController.showGameOver();
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
             -> KILL_PLAYER -> LOAD_LEVEL or SHOW_GAME_OVER
             -> SHOW_GAME_OVER -> GAME_OVER -> LOAD_INTRODUCTION
```

---

## Main game loop

`src/js/main.ts` creates the Phaser game instance:

```ts
var game = new Phaser.Game(640, 400, Phaser.AUTO, '', {
  preload: preload,
  create: create,
  update: updateGame
});
```

Every frame, Phaser calls:

```text
updateGame()
 -> Runtime.update()
   -> Runtime.gameController.update()
```

`Runtime.update()` is the lifecycle façade used by `main.ts`; `Runtime.gameController.update()` then dispatches to one method per game state.

During normal gameplay, the preserved update order is:

```text
Runtime.gameController.updatePlaying()
 -> update air gameplay rule and air HUD
 -> Runtime.hud.displayBonusMan(Runtime.level.bonusMan)
 -> Runtime.level.updateMonsters(Runtime.gameController.isPlaying())
 -> Runtime.player.update(Runtime.level)
 -> apply PlayerInteractionResult consequences
```

The update order is gameplay-sensitive and should be changed only with care.

---

## `src/main.ts`

This is the Vite module entry point referenced by `index.html`.

It imports `src/js/main.ts`, which creates the Phaser game instance and pulls in the rest of the runtime through normal ES module imports.

This file does not contain gameplay logic.

---

## `src/js/main.ts`

`main.ts` owns the Phaser lifecycle entry points and the shared Phaser globals.

Main responsibilities:

- create the Phaser instance;
- initialize the remaining Phaser globals on `window`;
- delegate Phaser lifecycle callbacks to the active runtime instance:
  - `Runtime.preload()`;
  - `Runtime.create()`;
  - `Runtime.update()`.

Important globals created here:

```text
game
map
layer
keyPressed
vanishingPlatformGroup
```

---

## `src/js/assetLoader.ts`

`AssetLoader` centralizes Phaser asset preloading.

It remains a stateless service-style module. `main.ts` no longer imports it directly; the preload lifecycle callback now goes through `Runtime.preload()`, which delegates to `AssetLoader.preload()`.

Responsibilities:

- load the Tiled JSON map;
- load tile set images;
- load player sprites;
- load monster sprites;
- load visual effect sprites;
- load HUD and screen sprites;
- load animated tile sprites;
- load the bitmap font image.

The asset keys and sprite dimensions are part of the current runtime contract and should be renamed only with care.

---

## `src/js/gameInitializer.ts`

`GameInitializer` owns the runtime startup sequence executed from `Runtime.create()`, which is itself called by Phaser's `create()` callback.

Main responsibilities:

- configure Phaser scaling and page alignment;
- start Arcade Physics;
- create the Tiled map and main layer;
- create animated tile sprites where needed;
- initialize runtime groups;
- create the shared `ScreenOverlay` rectangles;
- create and initialize the player and monster support groups;
- create cursor-key input;
- load the hi-score from `localStorage`;
- initialize the HUD with runtime values;
- set the initial game state.

---

## `src/js/gameController.ts`

`GameController` is the high-level state orchestrator.

Main private data:

- current game state;
- current score;
- current hi-score;
- current lives.

Read-only public properties:

- `score`
- `hiScore`
- `lives`

Important public methods:

- state transition methods such as `loadLevel()`, `startPlaying()`, `endLevel()`, `endGame()`, `killPlayer()`;
- `isPlaying()`;
- `addScore()`;
- `loseLife()`;
- `hasNoLives()`;
- `resetScoreAndLives()`;
- `loadHiScore()`;
- `updateHiScoreIfNeeded()`.

`setState()` is private. Other modules should not set raw `GameStates` values.

`GameController` consumes result objects from lower-level systems:

- `PlayerInteractionResult` from `Player.update()`;
- `LevelTransitionResult` from `LevelTransition.update()`;
- `EndGameSequenceResult` from `EndGameSequence.update()`.

This keeps the global consequences in one place: score changes, HUD refreshes, death flow, level transitions, game-over flow, and return to the title screen.

---

## `src/js/screenManager.ts`

`ScreenManager` handles screens that are not normal gameplay screens.

Responsibilities:

- display the title screen;
- remove the title screen;
- display the help/instructions screen;
- display the game-over logo;
- remove the game-over logo.

`ScreenManager` does not change game state directly. For example, the help screen receives a callback that is invoked when the player leaves the screen. `GameController` decides which state comes next.

`ScreenManager` uses `ScreenOverlay` for the shared black background.

---

## `src/js/screenOverlay.ts`

`ScreenOverlay` owns the fixed-camera black overlay graphics shared by screen and sequence code.

It replaces the previous implicit reuse of `LevelRevealSequence`'s black rectangles by unrelated screens.

Responsibilities:

- create the two black overlay rectangles;
- draw the upper rectangle;
- draw the lower rectangle;
- draw a full-screen or full-camera overlay;
- clear one or both overlay rectangles.

It is used by:

- `LevelRevealSequence`;
- `ScreenManager`;
- `EndGameSequence`.

---

## `src/js/level.ts`

`Level` owns the current level state and level-owned runtime objects.

Private state includes:

- current level number;
- current air level;
- collected key count;
- bonus-man availability;
- current monster list;
- monster display group;
- monster animation counters;
- explosion groups;
- current level exit object.

Read-only public properties:

- `level`
- `airLevel`
- `keysTaken`
- `bonusMan`

Important methods:

- `load(player)`;
- `resetGame()`;
- `resetAirLevel()`;
- `decreaseAir()`;
- `increaseAir()`;
- `advanceToNextLevel()`;
- `collectKey()`;
- `hasCollectedAllKeys()`;
- `isLastLevel()`;
- `enableBonusMan()`;
- `consumeBonusMan()`;
- `createMonstersGroup()`;
- `initMonsters()`;
- `addMonsters()`;
- `displayMonsters(onComplete)`;
- `updateMonsters(isPlaying)`;
- `collidesWithMonsterArea(...)`;
- `collidesWithExitArea(...)`;
- `hideMonstersWithReverseExplosions()`.

`Level.load(player)` receives a `LevelPlayer` interface rather than importing `PlayerController` directly.

`Level` owns monster and exit collisions because those objects belong to the level. `CollisionDetector` remains focused on generic tile/rectangle checks.

---

## `src/js/levelObjectLoader.ts`

`LevelObjectLoader` isolates Tiled object lookup and Phaser sprite creation for objects that belong to a level.

Responsibilities:

- find monster objects for the current level in the Tiled `monsters` object layer;
- destroy old monster sprites when a level is reloaded;
- create `Monster` instances and add their sprites to the level-owned monster group;
- hide monster sprites until the monster reveal animation finishes;
- find the current level exit object in the Tiled `end level` object layer;
- create or reposition the invisible exit sprite used by player/exit collision checks.

This module does not own gameplay state. It returns created objects to `Level`.

---

## `src/js/levelRevealSequence.ts`

`LevelRevealSequence` handles the progressive reveal shown when a level starts.

Responsibilities:

- progressively move the two `ScreenOverlay` rectangles away;
- return `true` when the reveal is finished.

It does not change `GameController` state directly. `GameController` decides when to enter the next state.

---

## `src/js/levelTransition.ts`

`LevelTransition` handles the transition after a level has been completed.

It is a frame-by-frame state machine.

Current phases:

1. prepare the next level;
2. hide the monsters from the completed level;
3. restore the gray background;
4. precisely align the player on one axis;
5. convert the remaining air into score;
6. move the player toward the next level start position;
7. refill the air bar;
8. load the next level and continue with the next level start sequence.

`LevelTransition.update()` returns a `LevelTransitionResult`:

```ts
export interface LevelTransitionResult {
    scoreDelta: number;
    airChanged: boolean;
    airCleared: boolean;
    nextLevelLoaded: boolean;
}
```

`GameController` applies the score and HUD consequences. `LevelTransition` still uses `Level` and `Player` directly because the transition is currently a gameplay/visual hybrid that moves the player and changes level data.

This is one of the remaining reasonable candidates for future dependency reduction, but it should not be abstracted unless the result is genuinely clearer.

---

## `src/js/endGameSequence.ts`

`EndGameSequence` handles the final congratulations sequence after the last level.

It is a frame-by-frame state machine. It owns the visual sequence and returns an `EndGameSequenceResult` describing what happened during the frame:

```ts
export interface EndGameSequenceResult {
    scoreDelta: number;
    airDecreaseAmount: number;
    airChanged: boolean;
    airCleared: boolean;
    airResetRequired: boolean;
    finished: boolean;
}
```

`EndGameSequence` does not import `HUD`, `Level`, or `GameController`. `GameController` applies the score, air, HUD and reset consequences.

---

## `src/js/player.ts`

`Player` owns the playable character sprite and the character-specific runtime state.

Private state includes:

- jumping state;
- jump path index;
- remembered horizontal jump direction;
- fall height;
- deadly-fall flag;
- normal player sprite;
- dying player sprite;
- animation counters.

Responsibilities:

- create the normal player sprite;
- reset the player at the beginning of a level;
- delegate movement rules to `PlayerMovement`;
- delegate gameplay interactions to `PlayerInteractions`;
- delegate the visual death animation to `PlayerDeathSequence`;
- expose behaviour-focused methods used by movement and transition code.

Important methods include:

- `create()`;
- `reset(levelNumber)`;
- `update(interactionContext)`;
- `kill(onComplete)`;
- `startJump()`;
- `rememberJumpDirection()`;
- `applyCurrentJumpPathFrame()`;
- `landFromJump()`;
- `startDeadlyFall()`;
- `moveBodyX()` / `moveBodyY()`;
- `setBodyX()` / `setBodyY()`;
- `getBodyX()` / `getBodyY()`;
- `hideSprite()`;
- `isDeadlyFall()`.

Some methods are technical facades around Phaser sprite/body access. They exist to avoid exposing `playerSprite` directly while preserving the existing Phaser 2 movement code.

The jump trajectory comes from:

```ts
Data.jumpPath
```

This data-driven jump path is gameplay-sensitive and should not be rewritten casually.

---

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

`PlayerMovement.update(player)` returns a `PlayerMovementResult`:

```ts
export interface PlayerMovementResult {
    x: number;
    y: number;
    checkInteractions: boolean;
    playerKilled: boolean;
}
```

The returned coordinates are the coordinates captured at the beginning of the frame. `PlayerInteractions` intentionally uses those original coordinates to preserve collision timing from the previous implementation.

Most movement checks use manual pixel probes through `CollisionDetector`. The hard-coded offsets in this file are gameplay-sensitive and define much of the platforming feel.

---

## `src/js/playerInteractions.ts`

`PlayerInteractions` handles gameplay interactions triggered by the player position, but not movement rules.

Responsibilities:

- detect key collection;
- hide collected key tiles;
- detect deadly tiles;
- detect monster collisions through the supplied context;
- detect exit collision through the supplied context;
- return a `PlayerInteractionResult`.

`PlayerInteractions` does not import `Level`, `HUD`, or `GameController` directly.

It receives a `PlayerInteractionContext`:

```ts
export interface PlayerInteractionContext {
    collectKey(): void;
    hasCollectedAllKeys(): boolean;
    collidesWithMonsterArea(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean;
    collidesWithExitArea(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean;
}
```

`Level` currently satisfies this context, and `GameController` passes it into `Player.update(Level)`.

---

## `src/js/playerDeathSequence.ts`

`PlayerDeathSequence` handles only the visual death animation.

Responsibilities:

- hide the normal player sprite;
- create the separate death-animation sprite;
- use the white death sprite after a deadly fall;
- play the death animation;
- invoke a callback when the animation completes.

It does not handle lives, bonus-man state, HUD refreshes, level reloads, or game-over decisions. Those global consequences are owned by `GameController`.

---

## `src/js/monster.ts`

`Monster` is a class for enemy instances.

Each monster is created from a Tiled object and from collision properties stored in the monster tileset.

Responsibilities:

- create the monster sprite;
- read its initial direction;
- read its maximum movement distance;
- store its real hitbox;
- move horizontally or vertically;
- reverse direction when the maximum distance is reached;
- optionally advance the sprite animation when Level tells it to.

Monsters do not chase the player. They follow predefined paths.

`Monster` does not import `Level` or `GameController`.

---

## `src/js/HUD.ts`

`HUD` handles the display and update of the lower status area.

Responsibilities:

- create the black HUD area below the playfield;
- display the air bar;
- display lives;
- display the score;
- display the current level number;
- display the hi-score;
- display and animate the bonus man;
- own the HUD-specific air-decrease counter.

`HUD` no longer imports `Level`, `Player`, or `GameController`. Values are passed in explicitly by callers.

Important methods include:

```ts
HUD.init(lives, score, level, hiScore, airLevel);
HUD.update(lives, score, hiScore, level);
HUD.displayScore(score);
HUD.displayLives(lives);
HUD.displayAirLevel(airLevel);
HUD.displayBonusMan(bonusMan);
HUD.hideBonusMan();
HUD.clearAirLevel();
HUD.consumeAirDecreaseAmount();
```

The gameplay rule “air reaching zero kills the player” is owned by `GameController`, not by `HUD`.

---

## `src/js/collisionDetector.ts`

`CollisionDetector` contains generic manual collision checks used by movement and player interactions.

Main responsibilities:

- test collisions along horizontal and vertical tile lines;
- test collisions around rectangle edges;
- test disappearing platforms;
- store `lastTileHit` so collected key tiles can be hidden.

`CollisionDetector` no longer checks monsters or the level exit. Those are level-owned collision checks handled by `Level`.

Most player movement and interaction checks depend on this file, so it remains gameplay-critical. The algorithms intentionally still scan pixel-by-pixel, matching the previous behavior.

---

## `src/js/util.ts`

`Util` contains shared non-collision helper functions.

Main responsibilities:

- create animated sprites from tile definitions;
- find Tiled objects by property;
- retrieve monster tile properties;
- draw text using the game font.

---

## `src/js/data.ts`

`Data` contains static gameplay data.

Main contents:

- `jumpPath`: per-frame jump trajectory data;
- `levels`: key count and monster animation speed per level;
- `bonusManColors`: colors used to animate the bonus man.

The required number of keys for the current level is now normally checked through:

```ts
Level.hasCollectedAllKeys()
```

rather than by reading `Data.levels` directly from gameplay code.

---

## Level loading flow

Level loading is mainly orchestrated by `GameController` and `Level`.

Simplified flow:

```text
GameController.updateLoadLevel()
 -> Level.load(Player)
    -> reset level attempt data
    -> Player.reset(current level)
    -> Level.addMonsters()
       -> LevelObjectLoader.loadMonsters(...)
    -> LevelObjectLoader.loadEndLevel(...)
 -> HUD.update(lives, score, hiScore, level)
 -> GameController.displayLevel()
```

After loading, the level is revealed by `LevelRevealSequence`, then monsters are revealed by `Level.displayMonsters(onComplete)`, and gameplay begins.

---

## Level start flow

```text
GameStates.LOAD_LEVEL
 -> GameController.updateLoadLevel()
 -> GameStates.DISPLAY_LEVEL
   -> LevelRevealSequence.update()
   -> GameStates.START_LEVEL
     -> Level.displayMonsters(onComplete)
     -> GameStates.DISPLAYING_MONSTERS
       -> callback: GameController.startPlaying()
```

---

## Normal gameplay flow

During `GameStates.PLAYING`:

```text
GameController.updatePlaying()
 -> updateAirLevelDuringGameplay()
 -> HUD.displayBonusMan(Level.bonusMan)
 -> Level.updateMonsters(GameController.isPlaying())
 -> Player.update(Level)
 -> if key collected: add score and refresh HUD score
 -> if player killed: start player death flow
 -> if exit reached: end level or end game
```

`Player.update()` delegates movement to `PlayerMovement` and gameplay interaction checks to `PlayerInteractions`.

---

## End-of-level flow

When all keys have been collected and the player touches the exit:

```text
Player.update(Level)
 -> PlayerInteractions.update(...)
 -> returns { exitReached: true }
 -> GameController.endLevel()
```

Then:

```text
GameController.updateEndLevel()
 -> LevelTransition.update()
 -> applies returned score / air / HUD consequences
 -> if nextLevelLoaded: HUD.update(...), GameController.startLevel()
```

The transition moves the player toward the next level start, converts remaining air into score, refills the air, loads the next level, and then returns control to the normal level-start sequence.

---

## End-game flow

When the last level has been completed:

```text
Player.update(Level)
 -> PlayerInteractions.update(...)
 -> returns { exitReached: true }
 -> GameController.endGame()
```

Then:

```text
GameController.updateEndGame()
 -> EndGameSequence.update(Level.airLevel)
 -> applies returned score / air / HUD consequences
 -> when finished: reset score/lives/level and return to introduction
```

---

## Player death flow

Player death can be caused by:

- collision with a deadly tile;
- collision with a monster;
- deadly fall;
- depleted air.

Movement and interaction code no longer directly decide the global consequences of death. They report `playerKilled: true`, or `GameController` detects depleted air.

Simplified flow:

```text
GameController.startPlayerDeath()
 -> GameController.killPlayer()
 -> Player.kill(onComplete)
    -> PlayerDeathSequence.start(Player, onComplete)
       -> hide normal sprite
       -> create death sprite
       -> play death animation
       -> callback
 -> GameController.finishPlayerDeath()
    -> consume bonus man or lose one life
    -> refresh HUD
    -> reset air
    -> load level or show game over
```

---

## Hi-score flow

The hi-score is read from `localStorage` during startup:

```ts
localStorage.getItem('hiScore')
```

It is updated by `GameController.updateHiScoreIfNeeded()` if the current score is greater than the stored hi-score.

---

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

---

## Technical points to watch

### Runtime dependencies are reduced, but not eliminated

The code is now much less coupled than the original global-object version. Several visual and gameplay subsystems return result objects or receive small context interfaces instead of importing the whole runtime.

However, the architecture still has one active runtime instance, exported as `Runtime`, and `GameController` remains the orchestration hub. This is acceptable for the current Phaser 2.3 remake. Avoid forcing dependency injection everywhere unless it makes the code clearly simpler.

### Avoid bureaucratic getters and setters

The project should continue favoring behaviour-focused methods that express gameplay intent:

```ts
Level.collectKey();
Level.decreaseAir(...);
GameController.addScore(...);
Player.startJump();
Player.startDeadlyFall();
```

Readonly getters are useful for display values such as `GameController.score` or `Level.airLevel`. Technical facades such as `Player.getBodyX()` or `Player.moveBodyX()` are acceptable because they hide Phaser sprite internals.

Avoid adding trivial `getX()` / `setX()` methods everywhere just to make fields private. That makes the code longer without making the game logic clearer.

### Global Phaser runtime context

The project still relies on `game`, `map`, `layer`, `keyPressed`, and `vanishingPlatformGroup` globals.

This shared context is workable, but it remains the main architectural limitation before a fuller migration to an explicit runtime context or modern Phaser scenes.

### TypeScript strictness is still gentle

The project uses TypeScript, but the type system is not yet strict. A future step can gradually tighten `tsconfig.json`, starting with:

1. `noImplicitAny: true`
2. `strictNullChecks: true`
3. `strict: true`

Do not enable everything at once unless the codebase is already clean.

### Manual collisions

Collision code is very specific to this game. Many checks are based on pixel probes and tile properties. Small changes can affect the feel of movement, jumping, ladders, falling, key collection, exit detection, and enemy collision.

### Counter-based sequences

Several sequences are still frame/counter based and depend on preserved timings and numeric thresholds:

- level reveal;
- monster reveal;
- end-of-level transition;
- end-game sequence;
- HUD air depletion;
- bonus man color animation.

### Player logic sensitivity

The player is the most sensitive part of the game. The jump trajectory, fall detection, ladder handling, and tile collision probes should be refactored only in small, well-tested steps.

---

## Possible future improvements

### Add explicit debug helpers

A debug mode would be useful for testing transitions and levels. It should not be active by default in production. A safe approach would be to enable it only through an explicit URL parameter such as:

```text
?debug=1
```

Possible helper methods:

```ts
Level.collectAllKeysForDebug();
GameController.startEndLevelForDebug();
```

This would be cleaner than running manual console loops.

### Document Tiled conventions separately

A dedicated document such as `doc/tiled_map_conventions.md` would be useful. It could describe every expected layer, object type, tile property, monster property, and coordinate offset.

### Reduce remaining Phaser globals

A future architecture could group shared Phaser runtime objects into a context object, then later replace the remaining global variables with explicit dependencies or Phaser scenes.

### Consider a LevelTransition context only if it stays readable

`LevelTransition` is one of the remaining modules that still coordinates `Level` and `Player` directly. It could eventually receive a small transition context, but this should be done only if the resulting code is clearer than the current direct calls.

### Prototype a newer Phaser version separately

A Phaser 2.3 to Phaser 4 migration should be treated as a prototype/port, not as a simple dependency bump. Keep it on a separate branch.

---

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

---

## Manual console helper for testing level transition

While running `npm run dev`, the following browser-console snippet gives the player all keys for the current level:

```js
const { Runtime } = await import('/src/js/gameRuntime.ts');

while (!Runtime.level.hasCollectedAllKeys()) {
    Runtime.level.collectKey();
}
```

Then touch the exit normally.

To trigger the transition directly:

```js
const { Runtime } = await import('/src/js/gameRuntime.ts');

while (!Runtime.level.hasCollectedAllKeys()) {
    Runtime.level.collectKey();
}

if (Runtime.level.isLastLevel()) {
    Runtime.gameController.endGame();
}
else {
    Runtime.gameController.endLevel();
}
```

This should remain a manual development helper unless a real debug mode is added later.
