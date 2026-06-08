# Son of Blagger — Current Phaser 4 Implementation

This document describes the current architecture of the TypeScript / Phaser 4 remake of **Son of Blagger**.

Its purpose is to help someone understand the project as it exists today: the Vite runtime, the Phaser scene graph, the gameplay flow, the responsibilities of each file, the Tiled map conventions, the debug helpers, and the technical points to watch before making further changes.

It is not a changelog. Historical implementation steps are intentionally not listed here.

---

## Project goal

This project is a web remake of the Commodore 64 game **Son of Blagger**.

The player controls Slippery Sid through maze-like scrolling levels. The goal is to collect all keys in the current level, avoid enemies and traps, then reach the exit to move to the next level. After the final level, the game shows the congratulations ending.

The engineering goal is to preserve the original gameplay behaviour while using a maintainable modern web stack: Vite, TypeScript modules and Phaser 4.

---

## Technical overview

- Engine: **Phaser 4.1**, installed from npm.
- Language: **TypeScript**.
- Development/build tool: **Vite**.
- Type checking: `tsc --noEmit` through `npm run typecheck`.
- Module system: TypeScript ES modules handled by Vite.
- Logical resolution: **640 x 400**.
- Gameplay viewport: the upper **640 x 200** area.
- HUD viewport: the lower **640 x 200** area, rendered by a separate scene.
- Map format: Tiled JSON map loaded by Phaser.
- Rendering: Phaser sprites, Phaser tilemap layers, manual bitmap-font text built from `fonts.png`.
- Audio: short OGG gameplay sound effects loaded through Phaser audio; no music is currently enabled.
- Physics: Phaser Arcade Physics is not the main collision system; most gameplay collisions are handled manually through tile probes and rectangles.
- Persistence: the hi-score is stored in `localStorage`.

The active runtime starts in `src/main.ts` and lives under:

```text
src/main.ts
src/data/
src/scenes/
src/audio/
src/entities/
src/state/
src/tiled/
src/ui/
src/debug/
src/optimization/
```

Static gameplay tables such as jump paths, level key counts and bonus-man colors live in `src/data/gameData.ts`. Restored one-shot sound effects are centralized in `src/audio/GameAudio.ts`, and GameMaker-style active-region data lives in `src/optimization/LevelActiveRegions.ts`.

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

`npm run dev` should be used for local development so the Vite module graph, TypeScript files and Phaser imports are handled correctly.

---

## Type checking

Run TypeScript type checking with:

```powershell
npm run typecheck
```

The current TypeScript setup is still deliberately permissive. `strict` and `noImplicitAny` are disabled because several Tiled data shapes and gameplay tables are still represented with lightweight types rather than a fully strict domain model.

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

On each push to `master`, GitHub Actions installs dependencies, runs the production build, uploads the generated `dist/` folder as a GitHub Pages artifact, and deploys that artifact to GitHub Pages.

The generated `dist/` folder is build output and should not be edited by hand or committed.

---

## Project structure

The active Phaser 4 layout is:

```text
index.html
package.json
package-lock.json
tsconfig.json
vite.config.js
src/
 main.ts
 scenes/
  PreloadScene.ts
  TitleScene.ts
  HelpScene.ts
  GameScene.ts
  HUDScene.ts
  GameOverScene.ts
  EndingScene.ts
 audio/
  GameAudio.ts
 entities/
  Player.ts
  PlayerDeathSequence.ts
  KeyCollector.ts
  DeadlyTileDetector.ts
  ExitDetector.ts
  Monster.ts
  MonsterManager.ts
  MonsterSpawnSequence.ts
  LevelRevealSequence.ts
  LevelTransitionSequence.ts
  EndGameSequence.ts
  AnimatedConveyors.ts
  AnimatedLadders.ts
  AnimatedWavePlatforms.ts
  VanishingPlatforms.ts
 tiled/
  tileCollisionProbe.ts
  tiledObjects.ts
 optimization/
  LevelActiveRegions.ts
 state/
  GameSessionState.ts
  LevelState.ts
  gameSessionConstants.ts
 data/
  gameData.ts
 ui/
  HUDState.ts
  hudConstants.ts
  RetroHudText.ts
 debug/
  DebugConsole.ts
  DebugPlayerControls.ts
public/
 assets/
  maps/
  sounds/
  sprites/
  tileset/
doc/
 current_implementation.md
```

`public/` is used for files that must be copied unchanged to the production `dist/` folder. This includes the Tiled map, tilesets, sprites, sound effects and bitmap font image.

---

## Entry point and Phaser configuration

`src/main.ts` is the Vite module entry point referenced by `index.html`.

It creates the Phaser game with:

- `type: AUTO`;
- logical size `640 x 400`;
- `Scale.FIT`;
- `Scale.CENTER_BOTH`;
- `pixelArt: false`;
- `roundPixels: true`.

The canvas is intentionally allowed to be smoothed by the browser when scaled. This keeps diagonal tiles and enlarged sprites visually stable at non-integer scale factors.

The registered scenes are:

```text
PreloadScene
TitleScene
HelpScene
GameScene
HUDScene
GameOverScene
EndingScene
```

---

## Scene overview

### `PreloadScene`

Loads all Phaser 4 assets needed by the current implementation:

- the Tiled JSON map;
- the background tileset;
- Slippery Sid sprites;
- death animation sprites;
- explosion and reverse-explosion sprites;
- bitmap font image;
- bonus-man sprite;
- title and game-over images;
- animated tile sprites;
- monster sprites;
- restored one-shot gameplay sound effects.

After loading, it starts `TitleScene`.

### `TitleScene`

Displays the title logo in the upper gameplay area and launches `HUDScene` below it with a fresh default session state.

Keyboard flow:

```text
H       -> HelpScene
any key -> GameScene with a new session
```

The HUD is stopped before leaving the title scene.

### `HelpScene`

Displays the instruction text using the retro bitmap font. Pressing any key returns to `TitleScene`.

The canvas is temporarily switched to `image-rendering: pixelated` while this full-screen text page is active, then restored when the scene shuts down.

### `GameScene`

Main gameplay scene. It owns the Tiled map, the upper gameplay camera, the player, animated tiles, active-region optimisation, keys, deadly tiles, exit detection, monsters, start-of-level reveal, monster spawn reveal, level transition, final sequence, gameplay sound triggers and debug hooks.

`GameScene` is still the main orchestration hub. Persistent session values live in `GameSessionState`, but actual Phaser objects are still created and coordinated by this scene.

### `HUDScene`

Lower status area. It displays:

- air label and air bar;
- lives;
- score;
- level;
- hi-score;
- bonus man;
- optional debug hint when `?debug=1` is enabled.

`HUDScene` receives `HUDState` updates through Phaser game events. It displays state; it does not decide gameplay rules such as when the player dies.

### `GameOverScene`

Overlay shown after the last life is lost. It displays the game-over image over the current play area and waits for a key press. Pressing a key stops `HUDScene` and `GameScene`, then returns to `TitleScene`.

### `EndingScene`

Final congratulations screen shown after the last level has been completed and the end-game air-to-score sequence is finished.

It displays the final message with the retro bitmap font and scales it up over time. After a short wait, it stops the active gameplay scenes and returns to `TitleScene`.

---

## Runtime state model

### `GameSessionState`

Owns state that belongs to the whole game session:

- current score;
- hi-score;
- remaining lives;
- current `LevelState`.

Important methods:

```ts
resetForNewGame();
addScore(points);
addKeyScore();
hasNextLevel();
advanceToNextLevelWithBonusMan();
consumeBonusManOrLife();
updateHiScoreIfNeeded();
toHUDState();
```

`toHUDState()` is the bridge between gameplay state and `HUDScene`.

### `LevelState`

Owns mutable state for the active level:

- one-based level number;
- required key count;
- collected key count;
- exit reached flag;
- air level;
- bonus-man availability;
- air-decrease timer.

Important methods:

```ts
collectKey();
collectAllKeysForDebug();
markExitReached();
hasCollectedAllKeys();
consumeAirWhenDue(deltaMs);
resetRun();
resetAirLevel();
decreaseAir(amount);
increaseAir(amount);
resetAirTimer();
enableBonusMan();
consumeBonusMan();
```

Air depletion is based on elapsed milliseconds rather than raw update counts, so the rate stays stable on high-refresh-rate screens.

### `gameSessionConstants.ts`

Contains shared gameplay values such as:

- initial level;
- level count;
- initial lives;
- default air level;
- air-decrease rhythm;
- score increments;
- air-to-score conversion steps.

---

## Main gameplay flow

### Application startup

```text
index.html
 -> src/main.ts
    -> new Phaser.Game(...)
       -> PreloadScene
          -> TitleScene
```

### Starting a game

```text
TitleScene key press
 -> stop title HUD
 -> start GameScene(resetSession: true)
    -> reset GameSessionState
    -> create Tiled map and background layer
    -> create collision probe and animated decoration systems
    -> apply active regions for the current level
    -> create player at current level start
    -> create key/deadly/exit systems
    -> create monsters for current level
    -> launch HUDScene
    -> start level reveal
```

### Level start flow

```text
LevelRevealSequence
 -> MonsterSpawnSequence
    -> monsters become active
       -> normal gameplay
```

While the level reveal or monster spawn sequence is active:

- player gameplay is blocked;
- monsters do not kill the player;
- air does not decrease.

### Normal gameplay update order

During normal gameplay, `GameScene.update()` approximately does this:

```text
update active animated decoration sprites
update death sequence
stop if game-over / ending / reveal / spawn / transition is active
apply debug free-move if enabled
consume air if due
update monsters
update player movement
kill player after deadly fall if needed
check deadly tiles and monster collisions
collect key if touched
check exit if all keys are collected
```

This order is gameplay-sensitive. Small changes can affect enemy timing, key pickup timing, death timing, or air depletion.

---

## Player and collision systems

### `Player`

Owns Slippery Sid's Phaser sprite and character-specific state:

- walking animation;
- jump state;
- jump path index;
- horizontal jump direction;
- fall height;
- deadly-fall flag;
- ladder, slide and conveyor movement hooks;
- collision rectangles used by other systems.

Important public methods include:

```ts
resetToTiledStart(...);
updateMovement(...);
cancelMovementForDebug();
getSprite();
getCenter();
getBodyCollisionBounds();
getDeadlyCollisionBounds();
getKeyCollectionBounds();
hide();
show();
```

The jump trajectory is data-driven and comes from `Data.jumpPath` in `src/data/gameData.ts`. This is one of the most gameplay-sensitive pieces of the project.

### `TileCollisionProbe`

Manual collision helper around the Tiled background layer.

It checks short world-space probe lines against tile properties for:

- walls;
- solid floors;
- solid tile tops;
- slides;
- ladders;
- conveyors.

The player movement logic depends on these probes rather than on a generic physics body collision solver. The probes scan the tile cells crossed by each line instead of checking every pixel, which keeps the contact rules tied to the 16x16 Tiled grid while reducing map lookups on slower devices.

### `KeyCollector`

Scans the edges of the player's key-collection rectangle against key tiles, hides collected key tiles, tracks collected tiles, and can collect all keys for debug. Like the collision probe, it scans tile cells rather than every pixel along each edge.

### `DeadlyTileDetector`

Scans the edges of the player's deadly-collision rectangle against tiles marked as deadly in Tiled. It uses tile-cell probes so trap checks do not perform a lookup for every pixel along the probe edge.

### `ExitDetector`

Uses the current level's `end level` Tiled object to detect when the player reaches the exit after all keys have been collected.

---

## Monsters

### `Monster`

Represents one enemy loaded from the Tiled `monsters` object layer.

Each monster:

- owns a Phaser sprite;
- reads its initial direction;
- reads its maximum movement distance;
- reads its collision hitbox from monster tileset properties;
- moves horizontally or vertically;
- reverses direction at the end of its path;
- advances animation frames when requested by the manager.

Monsters follow predefined paths. They do not chase the player.

### `MonsterManager`

Owns all monsters for the active level.

Responsibilities:

- load monsters for the current level;
- prepare monsters for spawn reveal;
- activate monsters after reveal;
- update movement and animation;
- test player/monster collision;
- destroy monsters when changing level;
- expose monster positions to transition and reveal sequences.

### `MonsterSpawnSequence`

Plays the explosion effect at each monster position before monsters become visible and dangerous.

### Reverse explosions during level transition

When a level is completed, `LevelTransitionSequence` asks the monster system to hide the current monsters with reverse-explosion effects before moving to the next level.

---

## Animated level objects

### `AnimatedConveyors`

Stores conveyor tile positions from the Tiled layer and creates animated visual overlays only for the active level regions. The Tiled tiles remain in the map and still provide movement properties; only their static visuals are hidden.

The frame timer uses `deltaMs` and can advance more than one frame if a browser frame is late. The accumulated remainder is kept so animation cadence remains stable.

### `AnimatedLadders`

Stores ladder tile positions and creates animated ladder rung overlays only for the active level regions. Ladder tiles stay in the Tiled layer for collision and movement probes.

### `AnimatedWavePlatforms`

Stores wave-platform tile positions and creates animated wave-platform overlays only for the active level regions. These platforms are mainly visual; collision still comes from the underlying Tiled tiles.

### `VanishingPlatforms`

Stores disappearing-platform tile positions, replaces the original static tiles with transparent tiles, and creates animated platform sprites only for the active level regions.

This class also owns vanishing-platform collision. A platform outside the active regions has no sprite and no collision entry, so it cannot behave like an invisible solid tile.

---

## Gameplay audio

### `GameAudio`

`src/audio/GameAudio.ts` centralizes the restored one-shot sound effects from the old GameMaker project.

Loaded effects:

```text
snd_key.ogg              -> key pickup, played at 50% volume
snd_player_dying.ogg     -> player death sequence start
snd_display_level.ogg    -> level reveal masks opening
snd_start_level.ogg      -> just before the monster spawn reveal
```

The old GameMaker archive also contained `snd_black_and_white.ogg`, but that file is the looping music track and is intentionally not used in the Phaser 4 runtime.

`GameAudio.stopGameplaySounds()` is called before the death effect starts so reveal/start sounds do not overlap a blocking state.

---

## Active-region optimisation

The whole Tiled map is still loaded as one continuous world. Active regions are an optimisation layer for animated decoration sprites, not a level-streaming system.

`src/optimization/LevelActiveRegions.ts` stores pixel rectangles ported from the old GameMaker active-region scripts. `GameScene.applyActiveRegionsForLevels()` passes those rectangles to:

```text
VanishingPlatforms
AnimatedLadders
AnimatedConveyors
AnimatedWavePlatforms
```

The animated decoration classes keep lightweight tile-entry lists for the whole map, but they create Phaser sprites only when the entry overlaps the current active regions. Sprites outside the active regions are destroyed, so they are removed from Phaser's display list and no longer receive animation frame updates.

During a level transition, `GameScene` temporarily activates both the current and next level regions. This avoids visible popping while the camera/player moves between levels.

Monsters are not handled by this system because `MonsterManager` already loads only the monsters for the current level.

---

## HUD and retro text

### `HUDScene`

Draws the lower black HUD panel and updates it from `HUDState` events.

The air bar is rendered as a red-to-blue gradient image with a black mask over it. The mask width is based on the current air value.

The bonus man is shown when `HUDState.hasBonusMan` is true and is tinted through the color table in `Data.bonusManColors`. The tint animation is driven by elapsed time, not raw browser update count.

### `HUDState`

Small data contract used by `GameSessionState` and `HUDScene`:

```ts
interface HUDState {
    lives: number;
    score: number;
    hiScore: number;
    levelNumber: number;
    airLevel: number;
    hasBonusMan: boolean;
}
```

### `RetroHudText`

Renders text by slicing `fonts.png` into 16x16 frames and composing one Phaser image per character.

It is used by the HUD, title prompt, help screen and ending screen. It supports multi-line text, tinting, character spacing, line spacing and scaling.

---

## Level transition flow

When all keys have been collected and the player touches the exit:

```text
GameScene.checkExitIfNeeded()
 -> current LevelState marks exit as reached
 -> if another level exists: start LevelTransitionSequence
 -> otherwise: start EndGameSequence
```

For normal level transitions, `LevelTransitionSequence`:

1. hides monsters from the completed level;
2. plays reverse-explosion effects;
3. flashes/restores the playfield background;
4. aligns the player toward the next level start;
5. converts remaining air into score;
6. moves the player automatically to the next level start;
7. refills the air bar;
8. lets `GameScene` load the next level objects;
9. starts the next monster spawn sequence.

The gameplay camera continues to follow the player while the transition moves him.

---

## End-game flow

When the final level exit is reached, `GameScene` starts `EndGameSequence`.

`EndGameSequence` converts remaining air into score and returns a small result object to `GameScene` each frame. `GameScene` applies score and air changes to `GameSessionState` / `LevelState` and updates the HUD.

When the sequence says the final message is ready:

```text
GameScene.showEndingScreen()
 -> update hi-score if needed
 -> launch EndingScene
 -> EndingScene scales the congratulations message
 -> after the wait: stop HUDScene and GameScene
 -> return to TitleScene
```

---

## Player death and game-over flow

Player death can be caused by:

- collision with a deadly tile;
- collision with a monster;
- deadly fall;
- depleted air.

Simplified flow:

```text
GameScene.startPlayerDeath()
 -> PlayerDeathSequence.start(...)
    -> hide normal player sprite
    -> play death animation
    -> callback into GameScene.finishPlayerDeath()
       -> consume bonus man if present, otherwise lose one life
       -> update hi-score if needed
       -> if no lives: launch GameOverScene
       -> otherwise reset player, keys, air and level start sequences
```

`GameOverScene` returns to the title screen on the next key press.

---

## Debug helpers for manual testing

Debug helpers are available only when the game is launched with:

```text
?debug=1
```

For example:

```text
http://localhost:5173/?debug=1
```

This installs `sobDebug` on `window` for browser-console testing.

Useful commands:

```js
sobDebug.help();
sobDebug.status();
sobDebug.collectAllKeys();
sobDebug.finishLevel();
sobDebug.finishGame();
sobDebug.resetLevel();
sobDebug.runtime();
```

`collectAllKeys()` gives the player all keys for the current level and opens the exit.

`finishLevel()` gives all keys and starts the level-completion flow directly. On the last level, it starts the final sequence.

`finishGame()` starts the final end-game sequence immediately from the current level. It is useful for tuning the ending without playing through the full map.

`resetLevel()` resets the player, keys, exit state and start-of-level sequences for the current level.

`status()` returns current state such as level, keys, air, lives, score, hi-score, active sequences and player coordinates.

`runtime()` returns the active `GameScene` instance for deeper inspection. This should remain a debug-only escape hatch.

Debug movement is also available with the numeric keypad:

```text
Numpad 8 -> up
Numpad 2 -> down
Numpad 4 -> left
Numpad 6 -> right
```

While a debug movement key is held, normal gameplay movement is skipped and the player is moved directly inside the Tiled map bounds.

---

## Tiled map conventions

The Phaser 4 runtime depends on conventions defined in the Tiled map and tilesets.

Important object layers and properties include:

- `player` object layer for level start positions;
- `monsters` object layer for enemies;
- `end level` object layer for exits;
- `level` property;
- monster `direction` property;
- monster `maxDistance` property;
- tile `name` property;
- tile `type` property;
- monster tileset hitbox properties.

Important tile concepts include:

- walls;
- solid tiles;
- ladders;
- keys;
- deadly tiles;
- slides;
- conveyor belts;
- vanishing platforms;
- wave platforms.

The Tiled data remains the source of truth for map layout, object placement and most collision semantics.

---

## Technical points to watch

### `GameScene` is still the orchestration hub

`GameSessionState` and `LevelState` hold persistent values, but `GameScene` still creates and coordinates most Phaser objects. Future refactoring should be done in small slices.

Good candidates for later extraction are:

- a dedicated level loader/runtime object;
- a cleaner game-flow state machine;
- a narrower runtime object for level-owned systems.

### Active regions must stay gameplay-neutral

Active regions should remain an optimisation for animated decoration sprites, not a replacement for the Tiled map or level rules. The background layer stays loaded because player movement, key collection, traps, exits and transition paths still read from the full map.

When changing active-region bounds, test level transitions carefully. During transitions, both the current and next level regions are intentionally active to avoid visual popping.

### Manual collisions are gameplay-critical

Many movement and interaction rules use tile-line probes and Tiled tile properties. Small changes can affect walking, jumping, landing, ladders, slides, conveyors, keys, exits, enemies and deadly falls.

### Timing should use elapsed time where possible

Animation and gameplay timings should generally use `deltaMs` instead of raw update counts so behaviour remains stable on 60 Hz, 120 Hz and 144 Hz displays.

Current systems already using elapsed-time accumulation include:

- air depletion;
- bonus-man tint animation;
- animated conveyors/ladders/wave platforms;
- vanishing platforms;
- level reveal;
- level transition;
- ending screen.

### Bitmap-font rendering has trade-offs

`RetroHudText` composes text from individual 16x16 glyph images. This keeps the HUD and screens close to the original style, but scaled text can show browser/WebGL artefacts at non-integer scale factors. Avoid large rewrites of text rendering unless they are tested visually on the title, help, HUD and ending screens.

---

## Comment conventions

Comments should document the current code, not the implementation history.

Use JSDoc-style block comments for:

- exported classes;
- exported interfaces;
- public methods whose contract matters;
- helpers whose behaviour is easy to misuse.

Use short `//` comments for:

- gameplay-sensitive offsets;
- tile probes;
- frame accumulators;
- clamps;
- non-obvious timing rules;
- deliberate rendering choices.

Avoid comments that merely repeat the code. Prefer comments that explain why the code exists, what contract it preserves, or what would break if a value changed.

---

## Manual test checklist

Before merging significant Phaser 4 changes, test at least:

- `npm run typecheck`;
- `npm run build`;
- launch without debug;
- launch with `?debug=1`;
- title screen;
- title HUD display;
- help screen with `H`;
- return from help;
- start a new game;
- level reveal;
- level reveal sound;
- monster spawn explosions;
- monster spawn start sound;
- left/right movement;
- jump;
- fall;
- deadly fall;
- ladders;
- slides;
- conveyors;
- vanishing platforms;
- wave platforms;
- key collection;
- key pickup sound;
- deadly tile collision;
- monster collision;
- air depletion;
- losing a life;
- player death sound;
- game-over screen after the last life;
- `sobDebug.collectAllKeys()`;
- `sobDebug.finishLevel()`;
- transition to the next level;
- score, lives, level number, hi-score, air bar and bonus man display;
- `sobDebug.finishGame()`;
- final congratulations screen;
- no red JavaScript error in the browser console.
