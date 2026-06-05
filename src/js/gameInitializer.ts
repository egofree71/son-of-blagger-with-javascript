import type { PhaserRuntimeContext } from "./phaserRuntimeContext.ts";
import type { GameControllerController } from "./gameController.ts";
import { Util } from "./util.ts";
import type { ScreenOverlayController } from "./screenOverlay.ts";
import type { PlayerController } from "./player.ts";
import type { HUDController } from "./HUD.ts";
import type { LevelController } from "./level.ts";

/**
 * Initializes the Phaser runtime once all assets have been preloaded.
 *
 * GameRuntime owns the Phaser lifecycle callbacks, while this object owns the
 * startup sequence that wires together the map, animated tiles, input, HUD,
 * player, monsters, screen overlays, and the initial game state.
 *
 * This module intentionally performs setup only. It should not contain gameplay
 * rules such as collisions, scoring, player movement, monster movement, or level
 * transitions. Keeping this file limited to bootstrapping makes the Phaser 2
 * lifecycle easier to understand and will also make a future Phaser migration
 * less risky.
 */
export class GameInitializerController
{
    constructor(
        private readonly phaserContext: PhaserRuntimeContext,
        private readonly gameController: GameControllerController,
        private readonly screenOverlay: ScreenOverlayController,
        private readonly player: PlayerController,
        private readonly hud: HUDController,
        private readonly level: LevelController
    )
    {
    }

    /**
     * Runs the complete Phaser create() setup sequence.
     *
     * The order matters:
     * - scaling and physics must be configured before sprites are created;
     * - the tilemap/layer must exist before animated tile sprites are extracted;
     * - player and monster sprites must exist before the HUD and overlays can be
     *   layered correctly;
     * - the first game state is selected only after every runtime object exists.
     */
    public create(): void
    {
        this.configureScaling();
        this.startPhysics();
        this.createMap();
        this.createAnimatedTiles();
        this.createRuntimeGroups();
        this.createPlayerAndMonsters();
        this.createInput();
        this.loadHiScore();
        this.initializeHud();
        this.createScreenOverlays();
        this.startAtIntroduction();
    }

    /**
     * Configures Phaser's canvas scaling for the browser window.
     *
     * SHOW_ALL preserves the original game aspect ratio and scales the canvas as
     * much as possible without cropping. The page alignment flags keep the game
     * centered when the browser window is larger than the scaled canvas.
     */
    private configureScaling(): void
    {
        const game = this.phaserContext.game;

        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.setScreenSize(true);
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
    }

    /**
     * Starts Phaser Arcade Physics and sets the default stage background.
     *
     * The current remake uses Arcade Physics mainly for sprite bodies and simple
     * position updates. Most tile collision checks are still custom pixel probes
     * handled by CollisionDetector.
     */
    private startPhysics(): void
    {
        const game = this.phaserContext.game;

        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.stage.backgroundColor = '#c0c0c0';
    }

    /**
     * Creates the Tiled map and the visible background layer.
     *
     * The map and layer are now assigned through PhaserRuntimeContext. The context
     * still mirrors them to window because older gameplay helpers access the
     * historical globals directly.
     */
    private createMap(): void
    {
        const game = this.phaserContext.game;

        this.phaserContext.map = game.add.tilemap('map');
        const map = this.phaserContext.map;

        map.addTilesetImage('background', 'background');
        map.addTilesetImage('monsters', 'monsters');

        this.phaserContext.layer = map.createLayer('background');
        this.phaserContext.layer.resizeWorld();
    }

    /**
     * Replaces selected static tiles with animated sprite overlays.
     *
     * The original tilemap remains the source of collision data. These generated
     * sprites are visual overlays only, used for animated conveyors, ladders,
     * waves, and vanishing platforms.
     */
    private createAnimatedTiles(): void
    {
        Util.createSpritesFromTiles(17, 'conveyorRight', 30);
        Util.createSpritesFromTiles(16, 'conveyorLeft', 30);
        Util.createSpritesFromTiles(28, 'ladderLeft', 30);
        Util.createSpritesFromTiles(29, 'ladderRight', 30);
        Util.createSpritesFromTiles(31, 'waveLeft', 30);
        Util.createSpritesFromTiles(32, 'waveRight', 30);

        // Stored through the Phaser runtime context because CollisionDetector
        // still checks this group through the legacy global bridge.
        this.phaserContext.vanishingPlatformGroup = Util.createSpritesFromTiles(33, 'vanishingPlatform', 2);
    }

    /**
     * Creates Phaser groups that are reused while loading/reloading levels.
     */
    private createRuntimeGroups(): void
    {
        this.level.createMonstersGroup();
    }

    /**
     * Creates long-lived player and monster runtime objects.
     *
     * Player.create() creates the player sprite once. Level.initMonsters() reads
     * monster definitions from the Tiled map and prepares their sprites. Level
     * loading later decides which monsters are visible for the current level.
     */
    private createPlayerAndMonsters(): void
    {
        this.player.create();
        this.level.initMonsters();

        // The player must stay visually above the tile layer and most animated
        // tile overlays, especially during the level reveal sequence.
        this.player.bringToTop();
    }

    /**
     * Creates the cursor-key helper used by player movement.
     *
     * The spacebar is read directly from game.input.keyboard in PlayerMovement,
     * while cursor keys are exposed through the historical keyPressed bridge.
     */
    private createInput(): void
    {
        this.phaserContext.keyPressed = this.phaserContext.game.input.keyboard.createCursorKeys();
    }

    /**
     * Loads the hi-score from browser localStorage.
     */
    private loadHiScore(): void
    {
        this.gameController.loadHiScore(localStorage.getItem('hiScore'));
    }

    /**
     * Creates HUD texts and sprites.
     */
    private initializeHud(): void
    {
        this.hud.init(this.gameController.lives, this.gameController.score, this.level.level, this.gameController.hiScore, this.level.airLevel);
    }

    /**
     * Creates the black overlay rectangles used by multiple screens and sequences.
     */
    private createScreenOverlays(): void
    {
        this.screenOverlay.createBlackRectangles();
    }

    /**
     * Selects the first game state after all runtime objects are ready.
     */
    private startAtIntroduction(): void
    {
        this.gameController.loadIntroduction();
    }
}

