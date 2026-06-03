declare const Phaser: any;

declare global {
  interface Window {
    game: any;
    map: any;
    layer: any;
    keyPressed: any;
    vanishingPlatformGroup: any;
  }
}

export {};
