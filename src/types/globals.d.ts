declare global {
  const Phaser: any;

  // Phaser 2.3 and a few runtime objects are still created as classic browser
  // globals by GameRuntime.start(), GameInitializer, and Phaser itself. These loose declarations keep the
  // first TypeScript migration pragmatic: they describe the current architecture
  // without forcing a full Phaser 2 type model yet.
  var game: any;
  var map: any;
  var layer: any;
  var keyPressed: any;
  var vanishingPlatformGroup: any;

  interface Window {
    game: any;
    map: any;
    layer: any;
    keyPressed: any;
    vanishingPlatformGroup: any;
  }
}

export {};
