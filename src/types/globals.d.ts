import type { SonOfBlaggerDebugTools } from "../js/debugTools.ts";

declare global {
  const Phaser: any;

  // Legacy runtime objects are still mirrored as classic browser globals by the
  // old JavaScript files. These loose declarations let TypeScript compile while
  // that legacy code remains in the repository.
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
    sobDebug?: SonOfBlaggerDebugTools;
  }
}

export {};
