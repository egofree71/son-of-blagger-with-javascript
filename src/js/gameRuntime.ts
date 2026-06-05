import { AssetLoader } from "./assetLoader.ts";
import { ScreenOverlayController } from "./screenOverlay.ts";
import { ScreenManagerController } from "./screenManager.ts";
import { HUDController } from "./HUD.ts";
import { LevelController } from "./level.ts";
import { PlayerController } from "./player.ts";
import { PlayerMovementController } from "./playerMovement.ts";
import { PlayerInteractionsController } from "./playerInteractions.ts";
import { PlayerDeathSequenceController } from "./playerDeathSequence.ts";
import { LevelRevealSequenceController } from "./levelRevealSequence.ts";
import { LevelTransitionController } from "./levelTransition.ts";
import { EndGameSequenceController } from "./endGameSequence.ts";
import { GameControllerController } from "./gameController.ts";
import { GameInitializerController } from "./gameInitializer.ts";

/**
 * Centralizes the creation of runtime controller instances.
 *
 * The exported Runtime instance is the active runtime used by phaserGame.ts.
 * Phaser lifecycle callbacks are routed through this class so the Phaser entry point
 * does not need to know which controllers perform preload, create, or update
 * work internally.
 */
export class GameRuntime
{
    readonly screenOverlay = new ScreenOverlayController();
    readonly screenManager = new ScreenManagerController(this.screenOverlay);

    readonly hud = new HUDController();
    readonly level = new LevelController();

    readonly playerMovement = new PlayerMovementController();
    readonly playerInteractions = new PlayerInteractionsController();
    readonly playerDeathSequence = new PlayerDeathSequenceController();
    readonly player = new PlayerController(
        this.playerMovement,
        this.playerInteractions,
        this.playerDeathSequence
    );

    readonly levelRevealSequence = new LevelRevealSequenceController(this.screenOverlay);
    readonly levelTransition = new LevelTransitionController(this.level, this.player);
    readonly endGameSequence = new EndGameSequenceController(this.screenOverlay);

    readonly gameController = new GameControllerController(
        this.screenManager,
        this.level,
        this.player,
        this.hud,
        this.levelRevealSequence,
        this.levelTransition,
        this.endGameSequence
    );

    readonly gameInitializer = new GameInitializerController(
        this.gameController,
        this.screenOverlay,
        this.player,
        this.hud,
        this.level
    );


    /**
     * Starts the active Phaser game instance.
     *
     * phaserGame.ts is only the Vite-loaded launcher now; the runtime owns the
     * creation of the Phaser.Game object and wires Phaser callbacks to the
     * active controller graph. The remaining Phaser globals are still kept on
     * window for compatibility with legacy Phaser 2 code.
     */
    public start(): void
    {
        window.map = null;
        window.keyPressed = null;
        window.layer = null;
        window.vanishingPlatformGroup = null;

        window.game = new Phaser.Game(640, 400, Phaser.AUTO, '', {
            preload: () => this.preload(),
            create: () => this.create(),
            update: () => this.update()
        });
    }

    /**
     * Phaser preload callback.
     *
     * AssetLoader remains a stateless module service for now, but phaserGame.ts no
     * longer needs to import it directly.
     */
    public preload(): void
    {
        AssetLoader.preload();
    }

    /**
     * Phaser create callback.
     */
    public create(): void
    {
        this.gameInitializer.create();
    }

    /**
     * Phaser update callback.
     */
    public update(): void
    {
        this.gameController.update();
    }
}

export const Runtime = new GameRuntime();
