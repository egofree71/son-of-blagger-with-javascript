# Son of Blagger

Web remake of **Son of Blagger**, the Commodore 64 platform game created by Antony Crowther.

The player controls Slippery Sid through scrolling maze-like levels. Each level requires collecting all keys, avoiding monsters and deadly tiles, then reaching the exit before the air runs out.

## Play online

[Play Son of Blagger on GitHub Pages](https://egofree71.github.io/son-of-blagger-with-javascript/)

Touch mode can also be tested online by adding `?touch=1` to the URL.

## Current stack

- Phaser 4.1
- TypeScript
- Vite
- Tiled JSON map and bitmap-style assets under `public/assets`
- Optional touch-control runtime mode enabled with `?touch=1`

## Controls

### Keyboard mode

- Left / right arrows: move
- Space: jump
- `H` on the title screen: help screen
- Any other key on the title screen: start a new game

### Touch mode

Launch the game with `?touch=1`, for example:

```text
http://localhost:5173/?touch=1
```

In touch mode:

- tap the title screen to start;
- use the on-screen left, right and up buttons during gameplay;
- tap `HELP` on the title HUD to open the help screen;
- tap the help or game-over screen to return;
- tap `FULL` to request fullscreen mode, then `EXIT` to leave it again.

Fullscreen must be triggered by a user action, so the game exposes it as a HUD button rather than enabling it automatically.

## Local development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run TypeScript checks:

```bash
npm run typecheck
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Documentation

The current implementation is documented in:

```text
doc/current_implementation.md
```
