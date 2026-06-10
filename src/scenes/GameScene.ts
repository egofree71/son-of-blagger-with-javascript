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
import type { DebugStatus } from "../debug/DebugConsole";
import { KeyCollector } from "../entities/KeyCollector";
import { DeadlyTileDetector } from "../entities/DeadlyTileDetector";
import { PlayerDeathSequence } from "../entities/PlayerDeathSequence";
import { ExitDetector } from "../entities/ExitDetector";
import { MonsterManager } from "../entities/MonsterManager";
import { MonsterSpawnSequence } from "../entities/MonsterSpawnSequence";
import { LevelRevealSequence } from "../entities/LevelRevealSequence";
import { LevelTransitionSequence } from "../entities/LevelTransitionSequence";
import { EndGameSequence } from "../entities/EndGameSequence";
import { GameSessionState } from "../state/GameSessionState";
import { GameAudio } from "../audio/GameAudio";
import { isTouchModeEnabled } from "../config/RuntimeMode";
import { GAMEPLAY_TICK_MS, MAX_GAMEPLAY_ACCUMULATED_MS, MAX_GAMEPLAY_TICKS_PER_RENDER } from "../config/GameplayTiming";
import type { PlayerInputControlChangedPayload, PlayerInputState } from "../input/PlayerInputState";
import { createEmptyPlayerInputState, mergePlayerInputStates, readKeyboardPlayerInput, TOUCH_CONTROL_CHANGED_EVENT } from "../input/PlayerInputState";
import type { ActiveRegion } from "../optimization/LevelActiveRegions";
import { getLevelActiveRegions } from "../optimization/LevelActiveRegions";
import { HUD_STATE_CHANGED_EVENT, EXIT_CHANGED_EVENT, KEYS_CHANGED_EVENT, PLAYER_KILLED_EVENT } from "./HUDScene";

interface GameSceneData
{
    resetSession?: boolean;
}

/**
 * Main gameplay scene.
 *
 * GameScene creates the Tiled map, animated decorations, player, keys, monsters
 * and level flow sequences. Persistent values such as score, lives, air and the
 * current level number live in GameSessionState; this scene orchestrates the
 * runtime objects that exist only while a level is being played.
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
    private endGameSequence?: EndGameSequence;
    private debugPlayerControls?: DebugPlayerControls;
    private debugConsole?: DebugConsole;
    private cursors?: Types.Input.Keyboard.CursorKeys;
    private touchInputState: PlayerInputState = createEmptyPlayerInputState();
    private touchModeEnabled = false;
    private currentPlayerStart?: TiledObjectLike;
    private deathCount = 0;
    private gameOverActive = false;
    private endingScreenActive = false;
    private gameplayTickAccumulatorMs = 0;

    constructor()
    {
        super("GameScene");
    }

    create(data: GameSceneData = {}): void
    {
        if (data.resetSession !== false) {
            this.sessionState.resetForNewGame();
            this.deathCount = 0;
        }

        this.gameOverActive = false;
        this.endingScreenActive = false;
        this.resetGameplayTickAccumulator();
        this.touchModeEnabled = isTouchModeEnabled();
        this.touchInputState = createEmptyPlayerInputState();

        // The C64-style playfield uses a light grey stage background behind empty
        // map areas.
        this.cameras.main.setBackgroundColor(GameScene.STAGE_BACKGROUND_COLOR);
        this.cameras.main.setViewport(0, 0, 640, GameScene.GAMEPLAY_VIEW_HEIGHT);

        this.map = this.make.tilemap({ key: "son-of-blagger-map" });

        const backgroundTileset = this.map.addTilesetImage("background", "background-tiles");

        if (!backgroundTileset) {
            this.showFatalMessage("Could not bind the Tiled 'background' tileset.");
            return;
        }

        const backgroundLayer = this.map.createLayer("background", backgroundTileset, 0, 0);

        if (!backgroundLayer) {
            this.showFatalMessage("Could not create the Tiled 'background' tile layer.");
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
        this.applyActiveRegionsForLevels(levelNumber);

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.createPlayerAtLevelStart(levelNumber);

        if (!this.player) {
            return;
        }

        this.levelTransitionSequence = new LevelTransitionSequence(this, this.player, this.monsterManager);
        this.endGameSequence = new EndGameSequence();
        this.exitDetector = this.createExitDetectorForLevel(levelNumber);

        if (!this.exitDetector) {
            return;
        }

        this.cursors = this.input.keyboard?.createCursorKeys();
        this.game.events.on(TOUCH_CONTROL_CHANGED_EVENT, this.handleTouchControlChanged, this);
        this.events.once("shutdown", () => this.removeTouchInputListeners());
        this.events.once("destroy", () => this.removeTouchInputListeners());

        if (DebugPlayerControls.isEnabled()) {
            this.debugPlayerControls = new DebugPlayerControls();
            this.debugConsole = new DebugConsole(this);
            this.debugConsole.install();

            // Debug helpers attach browser-level state, so remove everything if
            // the scene is restarted.
            this.events.once("shutdown", () => this.destroyDebugHelpers());
            this.events.once("destroy", () => this.destroyDebugHelpers());
        }

        this.scene.launch("HUDScene", {
            debugModeEnabled: this.debugPlayerControls !== undefined,
            touchModeEnabled: this.touchModeEnabled,
            showTouchControls: this.touchModeEnabled,
            ...this.sessionState.toHUDState()
        });

        this.startLevelStartSequences();
    }

    update(_time: number, delta: number): void
    {
        if (!this.map || !this.player || !this.collisionProbe || !this.vanishingPlatforms || !this.animatedLadders || !this.animatedConveyors || !this.animatedWavePlatforms || !this.keyCollector || !this.deadlyTileDetector || !this.playerDeathSequence || !this.exitDetector || !this.monsterManager || !this.monsterSpawnSequence || !this.levelRevealSequence || !this.levelTransitionSequence) {
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

        if (this.gameOverActive || this.endingScreenActive) {
            return;
        }

        if (this.endGameSequence?.isPlaying()) {
            this.updateEndGame(delta);
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

        this.runFixedGameplayTicks(delta);
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
        this.emitExitState();
    }

    /**
     * Marks the current level exit as reached from the browser console.
     */
    finishLevelForDebug(): void
    {
        this.collectAllKeysForDebug();
        this.sessionState.currentLevel.markExitReached();
        this.emitExitState();

        if (this.sessionState.hasNextLevel()) {
            this.startLevelTransition();
            return;
        }

        this.startEndGame();
    }


    /**
     * Starts the final end-game sequence from the browser console.
     *
     * This is deliberately available from any level so the ending screen can be
     * tuned visually without playing through the full map every time.
     */
    finishGameForDebug(): void
    {
        this.collectAllKeysForDebug();
        this.sessionState.currentLevel.markExitReached();
        this.gameOverActive = false;
        this.scene.stop("GameOverScene");
        this.emitExitState();
        this.startEndGame();
    }

    /**
     * Resets the current level runtime from the browser console.
     */
    resetLevelForDebug(): void
    {
        if (!this.player || !this.keyCollector || !this.currentPlayerStart) {
            return;
        }

        this.resetGameplayTickAccumulator();
        this.player.resetToTiledStart(this.currentPlayerStart);
        this.keyCollector.reset();
        this.sessionState.currentLevel.resetRun();
        this.endGameSequence?.stop();
        this.gameOverActive = false;
        this.endingScreenActive = false;
        this.touchModeEnabled = isTouchModeEnabled();
        this.touchInputState = createEmptyPlayerInputState();
        this.scene.stop("GameOverScene");
        this.scene.stop("EndingScene");
        this.startLevelStartSequences();

        this.emitHUDState();
        this.emitKeyState();
        this.emitExitState();
    }

    /**
     * Returns compact debug state for browser-console inspection.
     */
    getDebugStatus(): DebugStatus
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
            deaths: this.deathCount,
            lives: this.sessionState.lives,
            score: this.sessionState.score,
            hiScore: this.sessionState.hiScore,
            airLevel: levelState.airLevel,
            monstersLoaded: this.monsterManager?.count ?? 0,
            levelRevealSequencePlaying: this.levelRevealSequence?.isPlaying() ?? false,
            monsterSpawnSequencePlaying: this.monsterSpawnSequence?.isPlaying() ?? false,
            levelTransitionSequencePlaying: this.levelTransitionSequence?.isPlaying() ?? false,
            endGameSequencePlaying: this.endGameSequence?.isPlaying() ?? false,
            gameOverActive: this.gameOverActive,
            endingScreenActive: this.endingScreenActive,
            deathSequencePlaying: this.playerDeathSequence?.isPlaying() ?? false,
            player: sprite
                ? {
                    x: Math.round(sprite.x),
                    y: Math.round(sprite.y)
                }
                : null
        };
    }

    private readPlayerInput(): PlayerInputState
    {
        return mergePlayerInputStates(
            readKeyboardPlayerInput(this.cursors),
            this.touchInputState
        );
    }

    private handleTouchControlChanged(payload: PlayerInputControlChangedPayload): void
    {
        this.touchInputState = {
            ...this.touchInputState,
            [payload.control]: payload.active
        };
    }

    private removeTouchInputListeners(): void
    {
        this.game.events.off(TOUCH_CONTROL_CHANGED_EVENT, this.handleTouchControlChanged, this);
        this.touchInputState = createEmptyPlayerInputState();
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

        return this.startPlayerDeath();
    }

    /**
     * Runs fixed-tick gameplay through a stable simulation clock. The browser may
     * render at any refresh rate, but player movement, monsters and gameplay
     * collision checks should keep the same cadence.
     */
    private runFixedGameplayTicks(deltaMs: number): void
    {
        this.gameplayTickAccumulatorMs += Math.min(deltaMs, MAX_GAMEPLAY_ACCUMULATED_MS);

        let ticks = 0;

        while (
            this.gameplayTickAccumulatorMs >= GAMEPLAY_TICK_MS
            && ticks < MAX_GAMEPLAY_TICKS_PER_RENDER
        ) {
            this.gameplayTickAccumulatorMs -= GAMEPLAY_TICK_MS;
            ticks += 1;

            if (this.runGameplayLogicTick()) {
                this.resetGameplayTickAccumulator();
                break;
            }
        }

        if (ticks >= MAX_GAMEPLAY_TICKS_PER_RENDER) {
            // Drop a large backlog instead of letting a browser freeze trigger
            // many delayed gameplay ticks on the next rendered frames.
            this.gameplayTickAccumulatorMs = Math.min(
                this.gameplayTickAccumulatorMs,
                GAMEPLAY_TICK_MS
            );
        }
    }

    /**
     * Executes one deterministic gameplay tick. Returning true means the tick
     * started a blocking flow such as player death, level transition or ending.
     */
    private runGameplayLogicTick(): boolean
    {
        if (!this.map || !this.player || !this.collisionProbe || !this.vanishingPlatforms || !this.monsterManager) {
            return true;
        }

        // Monsters move before Sid resolves this tick's interaction checks, so
        // collisions are tested against their latest visible positions.
        this.monsterManager.update();

        const movementResult = this.player.updateMovement(
            this.readPlayerInput(),
            this.map,
            this.collisionProbe,
            this.vanishingPlatforms
        );

        if (movementResult.playerKilledByDeadlyFall) {
            return this.startPlayerDeath();
        }

        if (this.killPlayerIfNeeded()) {
            return true;
        }

        this.collectKeyIfNeeded();
        this.checkExitIfNeeded();

        return this.playerDeathSequence?.isPlaying()
            || this.levelTransitionSequence?.isPlaying()
            || this.endGameSequence?.isPlaying()
            || false;
    }

    private resetGameplayTickAccumulator(): void
    {
        this.gameplayTickAccumulatorMs = 0;
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

        return this.startPlayerDeath();
    }

    private startPlayerDeath(): boolean
    {
        if (!this.player || !this.playerDeathSequence) {
            return false;
        }

        this.resetGameplayTickAccumulator();
        GameAudio.stopGameplaySounds(this);
        GameAudio.playPlayerDying(this);
        this.playerDeathSequence.start(this.player, () => this.finishPlayerDeath());
        return true;
    }

    private finishPlayerDeath(): void
    {
        if (!this.player || !this.keyCollector || !this.currentPlayerStart) {
            return;
        }

        this.deathCount += 1;
        this.sessionState.consumeBonusManOrLife();
        this.sessionState.updateHiScoreIfNeeded();

        this.game.events.emit(PLAYER_KILLED_EVENT, {
            deaths: this.deathCount
        });

        if (this.sessionState.hasNoLives()) {
            this.showGameOverAfterLastLife();
            return;
        }

        this.resetGameplayTickAccumulator();
        this.sessionState.currentLevel.resetRun();
        this.player.resetToTiledStart(this.currentPlayerStart);
        this.keyCollector.reset();
        this.startLevelStartSequences();

        this.emitHUDState();
        this.emitKeyState();
        this.emitExitState();
    }


    private showGameOverAfterLastLife(): void
    {
        if (this.gameOverActive) {
            return;
        }

        this.monsterSpawnSequence?.stop();
        this.levelRevealSequence?.stop();
        this.levelTransitionSequence?.stop();
        this.endGameSequence?.stop();
        this.resetGameplayTickAccumulator();
        this.sessionState.resetForNewGame();
        this.gameOverActive = true;

        this.emitHUDState();
        this.emitKeyState();
        this.emitExitState();
        this.scene.launch("GameOverScene");
    }

    private startEndGame(): void
    {
        if (!this.endGameSequence || this.endingScreenActive) {
            return;
        }

        this.resetGameplayTickAccumulator();
        this.monsterSpawnSequence?.stop();
        this.levelRevealSequence?.stop();
        this.levelTransitionSequence?.stop();
        this.endGameSequence.start();
    }

    private updateEndGame(deltaMs: number): void
    {
        if (!this.endGameSequence) {
            return;
        }

        const levelState = this.sessionState.currentLevel;
        const result = this.endGameSequence.update(deltaMs, levelState.airLevel);

        if (result.scoreDelta > 0) {
            this.sessionState.addScore(result.scoreDelta);
        }

        if (result.airDelta < 0) {
            levelState.decreaseAir(Math.abs(result.airDelta));
        }

        if (result.airCleared) {
            levelState.decreaseAir(levelState.airLevel);
        }

        if (result.scoreDelta > 0 || result.airChanged || result.airCleared) {
            this.emitHUDState();
        }

        if (result.messageReady) {
            this.showEndingScreen();
        }
    }

    private showEndingScreen(): void
    {
        if (this.endingScreenActive) {
            return;
        }

        this.resetGameplayTickAccumulator();
        this.endGameSequence?.stop();
        this.sessionState.currentLevel.resetAirLevel();
        this.sessionState.updateHiScoreIfNeeded();
        this.emitHUDState();
        this.endingScreenActive = true;
        this.scene.launch("EndingScene");
    }


    private startLevelStartSequences(): void
    {
        if (!this.monsterManager || !this.levelRevealSequence) {
            return;
        }

        this.resetGameplayTickAccumulator();

        // Keep monsters hidden while the map opens: level reveal first, then
        // monster explosion reveal, then gameplay.
        this.monsterSpawnSequence?.stop();
        this.monsterManager.prepareForSpawnReveal();
        GameAudio.playDisplayLevel(this);
        this.levelRevealSequence.start(() => this.startMonsterSpawnSequence());
    }

    private startMonsterSpawnSequence(): void
    {
        if (!this.monsterManager || !this.monsterSpawnSequence) {
            return;
        }

        GameAudio.playStartLevel(this);
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

        GameAudio.playKey(this);
        this.sessionState.currentLevel.collectKey();
        this.sessionState.addKeyScore();
        this.emitHUDState();
        this.emitKeyState();
        this.emitExitState();
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
        this.emitExitState();

        if (!this.sessionState.hasNextLevel()) {
            this.startEndGame();
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
            this.showFatalMessage(`Could not find the level-${nextLevelNumber} player object in the Tiled map.`);
            return;
        }

        this.resetGameplayTickAccumulator();
        this.monsterSpawnSequence?.stop();
        this.levelRevealSequence?.stop();
        this.applyActiveRegionsForLevels(this.sessionState.currentLevel.levelNumber, nextLevelNumber);
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
            this.showFatalMessage(`Could not find the level-${levelNumber} player object in the Tiled map.`);
            return;
        }

        this.resetGameplayTickAccumulator();
        this.currentPlayerStart = playerStart;
        this.player.resetToTiledStart(playerStart);
        this.followPlayer(this.player);
        this.keyCollector.reset();
        this.exitDetector = this.createExitDetectorForLevel(levelNumber);
        this.applyActiveRegionsForLevels(levelNumber);
        this.monsterManager = new MonsterManager(this, this.map, levelNumber);
        this.monsterSpawnSequence = new MonsterSpawnSequence(this, this.monsterManager, "explosion");
        this.levelTransitionSequence?.setMonsterManager(this.monsterManager);
        this.sessionState.currentLevel.resetAirTimer();

        this.emitHUDState();
        this.emitKeyState();
        this.emitExitState();
        this.startMonsterSpawnSequence();
    }


    /**
     * Applies the GameMaker-style active regions to the animated decoration
     * overlays. During a level transition we temporarily keep both levels active
     * so the scrolling bridge does not pop sprites in and out.
     */
    private applyActiveRegionsForLevels(...levelNumbers: number[]): void
    {
        const activeRegions: ActiveRegion[] = [];

        for (const levelNumber of levelNumbers) {
            activeRegions.push(...getLevelActiveRegions(levelNumber));
        }

        this.vanishingPlatforms?.setActiveRegions(activeRegions);
        this.animatedLadders?.setActiveRegions(activeRegions);
        this.animatedConveyors?.setActiveRegions(activeRegions);
        this.animatedWavePlatforms?.setActiveRegions(activeRegions);
    }

    private emitKeyState(): void
    {
        const levelState = this.sessionState.currentLevel;

        this.game.events.emit(KEYS_CHANGED_EVENT, {
            keysCollected: levelState.keysCollected,
            keysNeeded: levelState.keysNeeded
        });
    }

    private emitExitState(): void
    {
        const levelState = this.sessionState.currentLevel;

        this.game.events.emit(EXIT_CHANGED_EVENT, {
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
            this.showFatalMessage(`Could not find the level-${levelNumber} player object in the Tiled map.`);
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
            this.showFatalMessage(`Could not find the level-${levelNumber} exit object in the Tiled map.`);
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

    private showFatalMessage(message: string): void
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
