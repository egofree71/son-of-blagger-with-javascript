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

/**
 * Centralizes the creation of runtime controller instances.
 *
 * This class is intentionally not wired into main.ts yet. The current game still
 * runs through the exported singleton instances, but GameRuntime documents and
 * type-checks the future instance-based composition shape.
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
}
