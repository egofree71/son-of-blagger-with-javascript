declare global {
  const Phaser: any;

  // Phaser 2.3 and a few runtime objects are still created as classic browser
  // globals by src/js/main.js / Phaser itself. These loose declarations keep the
  // first TypeScript migration pragmatic: they describe the current architecture
  // without forcing a full Phaser 2 type model yet.
  const game: any;
  const map: any;
  const layer: any;
  const keyPressed: any;
  const vanishingPlatformGroup: any;

  interface Window {
    game: any;
    map: any;
    layer: any;
    keyPressed: any;
    vanishingPlatformGroup: any;
  }
}

export {};
