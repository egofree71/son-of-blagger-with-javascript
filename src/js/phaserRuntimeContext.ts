/**
 * Owns access to the remaining Phaser 2 runtime globals.
 *
 * The game still has many legacy modules that read `game`, `map`, `layer`,
 * `keyPressed`, or `vanishingPlatformGroup` directly. This context is a bridge:
 * new composition code can use explicit dependencies, while old gameplay code
 * continues to see the same browser globals until those modules are migrated.
 */
export class PhaserRuntimeContext
{
    public reset(): void
    {
        window.map = null;
        window.keyPressed = null;
        window.layer = null;
        window.vanishingPlatformGroup = null;
    }

    public createGame(config: any): void
    {
        window.game = new Phaser.Game(640, 400, Phaser.AUTO, '', config);
    }

    public get game(): any
    {
        return window.game;
    }

    public get map(): any
    {
        return window.map;
    }

    public set map(value: any)
    {
        window.map = value;
    }

    public get layer(): any
    {
        return window.layer;
    }

    public set layer(value: any)
    {
        window.layer = value;
    }

    public get keyPressed(): any
    {
        return window.keyPressed;
    }

    public set keyPressed(value: any)
    {
        window.keyPressed = value;
    }

    public get vanishingPlatformGroup(): any
    {
        return window.vanishingPlatformGroup;
    }

    public set vanishingPlatformGroup(value: any)
    {
        window.vanishingPlatformGroup = value;
    }
}
