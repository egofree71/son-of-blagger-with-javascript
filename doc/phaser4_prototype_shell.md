# Son of Blagger — Phaser 4 prototype shell

This is the first Phaser 4 prototype shell.

Its only goal is to prove that the project can start through:

```text
Vite + TypeScript + npm Phaser package
```

It intentionally does not port gameplay yet.

## Files added or replaced

```text
index.html
src/main.ts
src/scenes/PreloadScene.ts
src/scenes/GameScene.ts
src/scenes/HUDScene.ts
doc/phaser4_prototype_shell.md
```

## What this shell does

- loads Phaser from the npm package;
- starts a 640x400 Phaser game;
- uses `PreloadScene`, `GameScene`, and `HUDScene`;
- loads two existing assets from `public/assets/sprites`;
- launches `HUDScene` as an overlay scene;
- does not use the old Phaser 2 global script;
- does not delete the old Phaser 2 source files.

## What it deliberately does not do yet

- no tilemap loading;
- no player movement;
- no collision checks;
- no monsters;
- no title/help/game-over flow;
- no gameplay state machine.

## Manual test

From the project root:

```powershell
npm run dev
```

Then open the local Vite URL.

You should see a simple Phaser 4 prototype screen with the Son of Blagger title, a player-preview image, a small animated marker, and a fake HUD line.

Then run:

```powershell
npm run typecheck
npm run build
```

## Files that can remain for now

Do not delete the old `src/js` folder yet. It is still useful as the Phaser 2 reference implementation.

`public/js/phaser.min.js` is no longer used by this prototype once `index.html` has been replaced, but it can also stay for now. Removing it is not urgent.
