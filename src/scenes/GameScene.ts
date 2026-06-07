import { Scene, Tilemaps, Types } from "phaser";
import { Player } from "../entities/Player";
import type { TiledObjectLike } from "../tiled/tiledObjects";
import { findObjectByLevel } from "../tiled/tiledObjects";
import { TileCollisionProbe } from "../tiled/tileCollisionProbe";
import { VanishingPlatforms } from "../entities/VanishingPlatforms";
import { AnimatedLadders } from "../entities/AnimatedLadders";
import { AnimatedConveyors } from "../entities/AnimatedConveyors";
import { AnimatedWavePlatforms } from "../entities/AnimatedWavePlatforms";
import { DebugPlayerControls } from "../debug/DebugPlayerControls";
import { DebugConsole } from "../debug/DebugConsole";
import type { PrototypeDebugStatus } from "../debug/DebugConsole";
import { KeyCollector } from "../entities/KeyCollector";
import { DeadlyTileDetector } from "../entities/DeadlyTileDetector";
import { PlayerDeathSequence } from "../entities/PlayerDeathSequence";
import { ExitDetector } from "../entities/ExitDetector";
import { MonsterManager } from "../entities/MonsterManager";
import { MonsterSpawnSequence } from "../entities/MonsterSpawnSequence";
import { LevelRevealSequence } from "../entities/LevelRevealSequence";
import { LevelTransitionSequence } from "../entities/LevelTransitionSequence";
import { GameSessionState } from "../state/GameSessionState";
import { HUD_STATE_CHANGED_EVENT, PROTOTYPE_EXIT_CHANGED_EVENT, PROTOTYPE_KEYS_CHANGED_EVENT, PROTOTYPE_PLAYER_KILLED_EVENT } from "./HUDScene";

/**
 * Main gameplay scene for the Phaser 4 prototype.
 *
 * This scene still orchestrates more responsibilities than the final port
 * should. It creates the Tiled map, animated decorations, player, keys,
 * monsters and temporary death/reset flow. Session values such as score, lives,
 * air and level number now live in GameSessionState so the next steps can move
 * toward real level transitions without adding more temporary fields here.
 */
export class GameScene extends Scene
{
    private static readonly GAMEPLAY_VIEW_HEIGHT = 200;
    private static readonly STAGE_BACKGROUND_COLOR = 0xc0c0c0;

    private readonly sessionState = new GameSessionState();
    private map?: Tilemaps.Tilemap;
    private player?: Player;
    private collisionProbe?: TileCollisionProbe;
    private vanishingPlatforms?: VanishingPlatforms;
    private animatedLadders?: AnimatedLadders;
    private animatedConveyors?: AnimatedConveyors;
    private animatedWavePlatforms?: AnimatedWavePlatforms;
    private keyCollector?: KeyCollector;
    private deadlyTileDetector?: DeadlyTileDetector;
    private playerDeathSequence?: PlayerDeathSequence;
    private exitDetector?: ExitDetector;
    private monsterManager?: MonsterManager;
    private monsterSpawnSequence?: MonsterSpawnSequence;
    private levelRevealSequence?: LevelRevealSequence;
    private levelTransitionSequence?: LevelTransitionSequence;
    private debugPlayerControls?: DebugPlayerControls;
    private debugConsole?: DebugConsole;
    private cursors?: Types.Input.Keyboard.CursorKeys;
    private currentPlayerStart?: TiledObjectLike;
    private temporaryDeathCount = 0;

    constructor()
    {
        super("GameScene");
    }

    create(): void
    {
        // Match the light grey Phaser 2 stage background so empty map areas are
        // not rendered as black during early prototype testing.
        this.cameras.main.setBackgroundColor(GameScene.STAGE_BACKGROUND_COLOR);
        this.cameras.main.setViewport(0, 0, 640, GameScene.GAMEPLAY_VIEW_HEIGHT);

        this.map = this.make.tilemap({ key: "son-of-blagger-map" });

        const backgroundTileset = this.map.addTilesetImage("background", "background-tiles");

        if (!backgroundTileset) {
            this.showFatalPrototypeMessage("Could not bind the Tiled 'background' tileset.");
            return;
        }

        const backgroundLayer = this.map.createLayer("background", backgroundTileset, 0, 0);

        if (!backgroundLayer) {
            this.showFatalPrototypeMessage("Could not create the Tiled 'background' tile layer.");
            return;
        }

        const levelNumber = this.sessionState.currentLevel.levelNumber;

        this.collisionProbe = new TileCollisionProbe(backgroundLayer);
        this.vanishingPlatforms = new VanishingPlatforms(this, backgroundLayer, "vanishing-platform");
        this.animatedLadders = new AnimatedLadders(this, backgroundLayer, "ladder-left", "ladder-right");
        this.animatedConveyors = new AnimatedConveyors(this, backgroundLayer, "conveyor-left", "conveyor-right");
        this.animatedWavePlatforms = new AnimatedWavePlatforms(this, backgroundLayer, "wave-left", "wave-right");
        this.keyCollector = new KeyCollector(backgroundLayer);
        this.deadlyTileDetector = new DeadlyTileDetector(backgroundLayer);
        this.playerDeathSequence = new PlayerDeathSequence(this, "blagger-dying", "blagger-dying-white");
        this.monsterManager = new MonsterManager(this, this.map, levelNumber);
        this.monsterSpawnSequence = new MonsterSpawnSequence(this, this.monsterManager, "explosion");
        this.levelRevealSequence = new LevelRevealSequence(this, 640, GameScene.GAMEPLAY_VIEW_HEIGHT);

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.createPlayerAtLevelStart(levelNumber);

        if (!this.player) {
            return;
        }

        this.levelTransitionSequence = new LevelTransitionSequence(this, this.player, this.monsterManager);
        this.exitDetector = this.createExitDetectorForLevel(levelNumber);

        if (!this.exitDetector) {
            return;
        }

        this.cursors = this.input.keyboard?.createCursorKeys();

        if (DebugPlayerControls.isEnabled()) {
            this.debugPlayerControls = new DebugPlayerControls();
            this.debugConsole = new DebugConsole(this);
            this.debugConsole.install();

            // Debug helpers attach browser-level state, so remove everything if
            // the scene is restarted during later prototype work.
            this.events.once("shutdown", () => this.destroyDebugHelpers());
            this.events.once("destroy", () => this.destroyDebugHelpers());
        }

        this.scene.launch("HUDScene", {
            debugModeEnabled: this.debugPlayerControls !== undefined,
            ...this.sessionState.toHUDState()
        });

        this.startLevelStartSequences();
    }

    update(_time: number, delta: number): void
    {
        if (!this.map || !this.player || !this.collisionProbe || !this.vanishingPlatforms || !this.animatedLadders || !this.animatedConveyors || !this.animatedWavePlatforms || !this.keyCollector || !this.deadlyTileDetector || !this.playerDeathSequence || !this.exitDetector || !this.monsterManager || !this.monsterSpawnSequence || !this.levelRevealSequence || !this.levelTransitionSequence || !this.cursors) {
            return;
        }

        this.vanishingPlatforms.update(delta);
        this.animatedLadders.update(delta);
        this.animatedConveyors.update(delta);
        this.animatedWavePlatforms.update(delta);
        this.playerDeathSequence.update(delta);

        if (this.playerDeathSequence.isPlaying()) {
            return;
        }

        if (this.levelRevealSequence.isPlaying()) {
            this.levelRevealSequence.update(delta);
            return;
        }

        if (this.monsterSpawnSequence.isPlaying()) {
            this.monsterSpawnSequence.update(delta);
            return;
        }

        if (this.levelTransitionSequence.isPlaying()) {
            this.updateLevelTransition(delta);
            return;
        }

        const debugFreeMoveActive = this.debugPlayerControls?.update(this.player, this.map, delta) ?? false;

        if (debugFreeMoveActive) {
            return;
        }

        if (this.consumeAirIfNeeded(delta)) {
            return;
        }

        // Match the Phaser 2 update order after air consumption: monsters move
        // before the player resolves this frame's interaction checks.
        this.monsterManager.update();

        const movementResult = this.player.updatePrototypeMovement(
            this.cursors,
            this.map,
            this.collisionProbe,
            this.vanishingPlatforms
        );

        if (movementResult.playerKilledByDeadlyFall) {
            this.startTemporaryPlayerDeath();
            return;
        }

        if (this.killPlayerIfNeeded()) {
            return;
        }

        this.collectKeyIfNeeded();
        this.checkExitIfNeeded();
    }

    /**
     * Collects all keys from the browser console when `?debug=1` is enabled.
     */
    collectAllKeysForDebug(): void
    {
        if (!this.keyCollector) {
            return;
        }

        this.keyCollector.collectAllForDebug(this.sessionState.currentLevel.keysNeeded);
        this.sessionState.currentLevel.collectAllKeysForDebug();
        this.emitHUDState();
        this.emitKeyState();
        this.emitTemporaryExitState();
    }

    /**
     * Marks the temporary level exit as reached from the browser console.
     */
    finishLevelForDebug(): void
    {
        this.collectAllKeysForDebug();
        this.sessionState.currentLevel.markExitReached();
        this.emitTemporaryExitState();

        if (this.sessionState.hasNextLevel()) {
            this.startLevelTransition();
        }
    }

    /**
     * Resets the current prototype level state from the browser console.
     */
    resetLevelForDebug(): void
    {
        if (!this.player || !this.keyCollector || !this.currentPlayerStart) {
            return;
        }

        this.player.resetToTiledStart(this.currentPlayerStart);
        this.keyCollector.reset();
        this.sessionState.currentLevel.resetRun();
        this.startLevelStartSequences();

        this.emitHUDState();
        this.emitKeyState();
        this.emitTemporaryExitState();
    }

    /**
     * Returns compact debug state for browser-console inspection.
     */
    getPrototypeDebugStatus(): PrototypeDebugStatus
    {
        const sprite = this.player?.getSprite();
        const levelState = this.sessionState.currentLevel;

        return {
            debugMode: this.debugPlayerControls !== undefined,
            level: levelState.levelNumber,
            keysCollected: levelState.keysCollected,
            keysNeeded: levelState.keysNeeded,
            exitReady: levelState.hasCollectedAllKeys(),
            exitReached: levelState.exitReached,
            deaths: this.temporaryDeathCount,
            lives: this.sessionState.lives,
            score: this.sessionState.score,
            hiScore: this.sessionState.hiScore,
            airLevel: levelState.airLevel,
            monstersLoaded: this.monsterManager?.count ?? 0,
            levelRevealSequencePlaying: this.levelRevealSequence?.isPlaying() ?? false,
            monsterSpawnSequencePlaying: this.monsterSpawnSequence?.isPlaying() ?? false,
            levelTransitionSequencePlaying: this.levelTransitionSequence?.isPlaying() ?? false,
            deathSequencePlaying: this.playerDeathSequence?.isPlaying() ?? false,
            player: sprite
                ? {
                    x: Math.round(sprite.x),
                    y: Math.round(sprite.y)
                }
                : null
        };
    }

    private consumeAirIfNeeded(deltaMs: number): boolean
    {
        const levelState = this.sessionState.currentLevel;

        if (!levelState.consumeAirWhenDue(deltaMs)) {
            return false;
        }

        this.emitHUDState();

        if (levelState.airLevel > 0) {
            return false;
        }

        return this.startTemporaryPlayerDeath();
    }

    private killPlayerIfNeeded(): boolean
    {
        if (!this.player || !this.deadlyTileDetector || !this.monsterManager || !this.playerDeathSequence) {
            return false;
        }

        const touchesDeadlyTile = this.deadlyTileDetector.touchesDeadlyTile(this.player.getDeadlyCollisionBounds());
        const touchesMonster = this.monsterManager.touchesPlayer(this.player.getBodyCollisionBounds());

        if (!touchesDeadlyTile && !touchesMonster) {
            return false;
        }

        return this.startTemporaryPlayerDeath();
    }

    private startTemporaryPlayerDeath(): boolean
    {
        if (!this.player || !this.playerDeathSequence) {
            return false;
        }

        this.playerDeathSequence.start(this.player, () => this.finishTemporaryPlayerDeath());
        return true;
    }

    private finishTemporaryPlayerDeath(): void
    {
        if (!this.player || !this.keyCollector || !this.currentPlayerStart) {
            return;
        }

        this.temporaryDeathCount += 1;
        this.sessionState.consumeBonusManOrLife();
        this.sessionState.updateHiScoreIfNeeded();
        this.sessionState.currentLevel.resetRun();

        // This remains a prototype consequence of death: the game-over screen is
        // not ported yet, so even at zero lives the level is reset for testing.
        this.player.resetToTiledStart(this.currentPlayerStart);
        this.keyCollector.reset();
        this.startLevelStartSequences();

        this.emitHUDState();

        this.game.events.emit(PROTOTYPE_PLAYER_KILLED_EVENT, {
            deaths: this.temporaryDeathCount
        });
        this.emitKeyState();
        this.emitTemporaryExitState();
    }


    private startLevelStartSequences(): void
    {
        if (!this.monsterManager || !this.levelRevealSequence) {
            return;
        }

        // Keep monsters hidden while the map opens, matching the original flow:
        // level reveal first, then monster explosion reveal, then gameplay.
        this.monsterSpawnSequence?.stop();
        this.monsterManager.prepareForSpawnReveal();
        this.levelRevealSequence.start(() => this.startMonsterSpawnSequence());
    }

    private startMonsterSpawnSequence(): void
    {
        if (!this.monsterManager || !this.monsterSpawnSequence) {
            return;
        }

        this.monsterSpawnSequence.start(() => {
            this.monsterManager?.activateAfterSpawnReveal();
        });
    }

    private collectKeyIfNeeded(): void
    {
        if (!this.player || !this.keyCollector) {
            return;
        }

        if (!this.keyCollector.collectFromPlayerProbe(this.player.getKeyCollectionBounds())) {
            return;
        }

        this.sessionState.currentLevel.collectKey();
        this.sessionState.addKeyScore();
        this.emitHUDState();
        this.emitKeyState();
        this.emitTemporaryExitState();
    }

    private checkExitIfNeeded(): void
    {
        const levelState = this.sessionState.currentLevel;

        if (!this.player || !this.exitDetector || levelState.exitReached || !levelState.hasCollectedAllKeys()) {
            return;
        }

        if (!this.exitDetector.touchesPlayer(this.player.getBodyCollisionBounds())) {
            return;
        }

        levelState.markExitReached();
        this.emitTemporaryExitState();

        if (!this.sessionState.hasNextLevel()) {
            // The final congratulations sequence is still not ported. Keep the
            // last-level exit marked as reached so the prototype remains stable.
            return;
        }

        this.startLevelTransition();
    }


    private startLevelTransition(): void
    {
        if (!this.map || !this.player || !this.levelTransitionSequence) {
            return;
        }

        const nextLevelNumber = this.sessionState.nextLevelNumber;
        const nextPlayerStart = findObjectByLevel(this.map, "player", nextLevelNumber);

        if (!nextPlayerStart) {
            this.showFatalPrototypeMessage(`Could not find the level-${nextLevelNumber} player object in the Tiled map.`);
            return;
        }

        this.monsterSpawnSequence?.stop();
        this.levelRevealSequence?.stop();
        this.levelTransitionSequence.start(Player.getTiledStartPosition(nextPlayerStart));
    }

    private updateLevelTransition(deltaMs: number): void
    {
        if (!this.levelTransitionSequence) {
            return;
        }

        const levelState = this.sessionState.currentLevel;
        const transitionResult = this.levelTransitionSequence.update(deltaMs, levelState.airLevel);

        if (transitionResult.scoreDelta > 0) {
            this.sessionState.addScore(transitionResult.scoreDelta);
        }

        if (transitionResult.airDelta < 0) {
            levelState.decreaseAir(Math.abs(transitionResult.airDelta));
        }
        else if (transitionResult.airDelta > 0) {
            levelState.increaseAir(transitionResult.airDelta);
        }

        if (transitionResult.airCleared) {
            levelState.decreaseAir(levelState.airLevel);
        }

        if (transitionResult.scoreDelta > 0 || transitionResult.airChanged || transitionResult.airCleared) {
            this.emitHUDState();
        }

        if (transitionResult.nextLevelReady) {
            this.loadNextLevelAfterTransition();
        }
    }

    private loadNextLevelAfterTransition(): void
    {
        if (!this.map || !this.player || !this.keyCollector) {
            return;
        }

        this.levelTransitionSequence?.stop();
        this.monsterManager?.destroy();
        this.sessionState.advanceToNextLevelWithBonusMan();

        const levelNumber = this.sessionState.currentLevel.levelNumber;
        const playerStart = findObjectByLevel(this.map, "player", levelNumber);

        if (!playerStart) {
            this.showFatalPrototypeMessage(`Could not find the level-${levelNumber} player object in the Tiled map.`);
            return;
        }

        this.currentPlayerStart = playerStart;
        this.player.resetToTiledStart(playerStart);
        this.followPlayer(this.player);
        this.keyCollector.reset();
        this.exitDetector = this.createExitDetectorForLevel(levelNumber);
        this.monsterManager = new MonsterManager(this, this.map, levelNumber);
        this.monsterSpawnSequence = new MonsterSpawnSequence(this, this.monsterManager, "explosion");
        this.levelTransitionSequence?.setMonsterManager(this.monsterManager);
        this.sessionState.currentLevel.resetAirTimer();

        this.emitHUDState();
        this.emitKeyState();
        this.emitTemporaryExitState();
        this.startMonsterSpawnSequence();
    }

    private emitKeyState(): void
    {
        const levelState = this.sessionState.currentLevel;

        this.game.events.emit(PROTOTYPE_KEYS_CHANGED_EVENT, {
            keysCollected: levelState.keysCollected,
            keysNeeded: levelState.keysNeeded
        });
    }

    private emitTemporaryExitState(): void
    {
        const levelState = this.sessionState.currentLevel;

        this.game.events.emit(PROTOTYPE_EXIT_CHANGED_EVENT, {
            exitReady: levelState.hasCollectedAllKeys(),
            exitReached: levelState.exitReached
        });
    }

    private emitHUDState(): void
    {
        this.game.events.emit(HUD_STATE_CHANGED_EVENT, this.sessionState.toHUDState());
    }

    private createPlayerAtLevelStart(levelNumber: number): void
    {
        if (!this.map) {
            return;
        }

        const playerStart = findObjectByLevel(this.map, "player", levelNumber);

        if (!playerStart) {
            this.showFatalPrototypeMessage(`Could not find the level-${levelNumber} player object in the Tiled map.`);
            return;
        }

        this.currentPlayerStart = playerStart;
        this.player = new Player(this, "blagger", "blagger-white");
        this.player.resetToTiledStart(playerStart);

        this.followPlayer(this.player);
    }

    private createExitDetectorForLevel(levelNumber: number): ExitDetector | undefined
    {
        if (!this.map) {
            return undefined;
        }

        const exitObject = findObjectByLevel(this.map, "end level", levelNumber);

        if (!exitObject) {
            this.showFatalPrototypeMessage(`Could not find the level-${levelNumber} exit object in the Tiled map.`);
            return undefined;
        }

        return new ExitDetector(exitObject);
    }

    private followPlayer(player: Player): void
    {
        const camera = this.cameras.main;

        // Keep the camera inside the imported Tiled map. The HUD uses a separate
        // scene, so this camera only owns the upper gameplay viewport.
        camera.setBounds(0, 0, this.map?.widthInPixels ?? 0, this.map?.heightInPixels ?? 0);

        // Round camera scrolling to whole pixels while following the player.
        // Sub-pixel camera scroll makes pixel-art tile edges shimmer.
        camera.startFollow(player.getSprite(), true, 1, 1);

        const playerCenter = player.getCenter();
        camera.centerOn(Math.round(playerCenter.x), Math.round(playerCenter.y));
    }


    private destroyDebugHelpers(): void
    {
        this.debugPlayerControls?.destroy();
        this.debugConsole?.destroy();
        this.debugPlayerControls = undefined;
        this.debugConsole = undefined;
    }

    private showFatalPrototypeMessage(message: string): void
    {
        this.add.text(320, 180, message, {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: 560 }
        }).setOrigin(0.5);
    }
}
