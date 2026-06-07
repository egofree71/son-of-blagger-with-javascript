# Son of Blagger

Web remake of **Son of Blagger**, the Commodore 64 platform game created by Antony Crowther.

The player controls Slippery Sid through scrolling maze-like levels. Each level requires collecting all keys, avoiding monsters and deadly tiles, then reaching the exit before the air runs out.

## Current stack

- Phaser 4.1
- TypeScript
- Vite
- Tiled JSON map and bitmap-style assets under `public/assets`

## Controls

- Left / right arrows: move
- Space: jump
- `H` on the title screen: help screen

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

## Debug mode

Launch the game with `?debug=1` to enable browser-console helpers:

```text
http://localhost:5173/?debug=1
```

Useful commands include:

```js
sobDebug.help();
sobDebug.status();
sobDebug.collectAllKeys();
sobDebug.finishLevel();
sobDebug.finishGame();
sobDebug.resetLevel();
sobDebug.runtime();
```

Debug free-move controls use the numeric keypad:

- Numpad 8: up
- Numpad 2: down
- Numpad 4: left
- Numpad 6: right

## Documentation

The current implementation is documented in:

```text
doc/current_implementation.md
```

## Play online

```text
https://egofree71.github.io/son-of-blagger-with-javascript/
```
