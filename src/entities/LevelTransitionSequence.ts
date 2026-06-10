import type { GameObjects, Scene } from "phaser";
import { MonsterManager } from "./MonsterManager";
import { Player } from "./Player";
import { GameSessionConstants } from "../state/gameSessionConstants";
import { EXPLOSION_EFFECT_FRAME_COUNT, EXPLOSION_EFFECT_FRAME_DURATION_MS } from "../config/SequenceAnimation";
import { LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS, LEVEL_TRANSITION_PLAYER_TILE_STEP_PX, SEQUENCE_REFERENCE_STEP_MS } from "../config/SequenceTiming";

interface LevelTransitionTarget
{
    x: number;
    y: number;
}

export interface LevelTransitionResult
{
    scoreDelta: number;
    airDelta: number;
    airChanged: boolean;
    airCleared: boolean;
    nextLevelReady: boolean;
}

type LevelTransitionPhase =
    | "hide-monsters"
    | "restore-background"
    | "fine-align-player"
    | "convert-air-to-score"
    | "move-player-to-next-level"
    | "refill-air"
    | "load-next-level";

/**
 * Runs the bridge between two playable levels.
 *
 * The sequence is deliberately update-driven: it hides the completed level's
 * monsters, converts remaining air into score, moves Sid toward the next Tiled
 * player start, refills the air bar, then asks GameScene to create the next
 * level runtime objects.
 */
export class LevelTransitionSequence
{
    private static readonly STAGE_COLOR_NORMAL = 0xc0c0c0;
    private static readonly STAGE_COLOR_TRANSITION = 0xff0000;
    private static readonly REVERSE_EXPLOSION_TEXTURE = "reverse-explosion";
    private static readonly REVERSE_EXPLOSION_DEPTH = 12;

    private readonly scene: Scene;
    private readonly player: Player;
    private monsterManager: MonsterManager;
    private phase: LevelTransitionPhase = "hide-monsters";
    private playing = false;
    private nextPlayerPosition: LevelTransitionTarget = { x: 0, y: 0 };
    private sequenceStepAccumulatorMs = 0;
    private movementCounter = LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS;
    private reverseExplosionFrameAccumulatorMs = 0;
    private reverseExplosionFrameIndex = 0;
    private readonly reverseExplosions: GameObjects.Sprite[] = [];

    /**
     * @param scene Gameplay scene used for camera color changes and effects.
     * @param player Sid entity moved automatically during the transition.
     * @param monsterManager Manager for the monsters currently visible on screen.
     */
    constructor(scene: Scene, player: Player, monsterManager: MonsterManager)
    {
        this.scene = scene;
        this.player = player;
        this.monsterManager = monsterManager;
    }

    /**
     * Rebinds the sequence after GameScene replaces the monster manager.
     */
    setMonsterManager(monsterManager: MonsterManager): void
    {
        this.monsterManager = monsterManager;
    }

    /**
     * Starts the bridge toward the next level's Tiled player start.
     */
    start(nextPlayerPosition: LevelTransitionTarget): void
    {
        this.stop();
        this.nextPlayerPosition = nextPlayerPosition;
        this.phase = "hide-monsters";
        this.playing = true;
        this.sequenceStepAccumulatorMs = 0;
        this.movementCounter = LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS;
    }

    /**
     * Advances the transition and reports which HUD/session values changed.
     */
    update(deltaMs: number, currentAirLevel: number): LevelTransitionResult
    {
        const result = this.createResult();

        if (!this.playing) {
            return result;
        }

        this.updateReverseExplosions(deltaMs);
        this.sequenceStepAccumulatorMs += deltaMs;

        while (this.sequenceStepAccumulatorMs >= SEQUENCE_REFERENCE_STEP_MS) {
            this.sequenceStepAccumulatorMs -= SEQUENCE_REFERENCE_STEP_MS;
            const stepResult = this.updateOneSequenceStep(currentAirLevel);
            result.scoreDelta += stepResult.scoreDelta;
            result.airDelta += stepResult.airDelta;
            result.airChanged = result.airChanged || stepResult.airChanged;
            result.airCleared = result.airCleared || stepResult.airCleared;
            result.nextLevelReady = result.nextLevelReady || stepResult.nextLevelReady;

            if (stepResult.nextLevelReady || stepResult.airChanged || stepResult.airCleared || !this.playing) {
                break;
            }
        }

        return result;
    }

    /**
     * Stops the transition and clears reverse explosion sprites.
     */
    stop(): void
    {
        this.playing = false;
        this.sequenceStepAccumulatorMs = 0;
        this.movementCounter = LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS;
        this.scene.cameras.main.setBackgroundColor(LevelTransitionSequence.STAGE_COLOR_NORMAL);
        this.destroyReverseExplosions();
    }

    /**
     * Reports whether normal gameplay should currently be blocked.
     */
    isPlaying(): boolean
    {
        return this.playing;
    }

    private updateOneSequenceStep(currentAirLevel: number): LevelTransitionResult
    {
        switch (this.phase) {
            case "hide-monsters":
                this.hideMonsters();
                return this.createResult();

            case "restore-background":
                this.restoreBackground();
                return this.createResult();

            case "fine-align-player":
                this.fineAlignPlayer();
                return this.createResult();

            case "convert-air-to-score":
                return this.convertAirToScore(currentAirLevel);

            case "move-player-to-next-level":
                this.movePlayerToNextLevel();
                return this.createResult();

            case "refill-air":
                return this.refillAir(currentAirLevel);

            case "load-next-level":
                this.playing = false;
                return {
                    ...this.createResult(),
                    nextLevelReady: true
                };
        }
    }

    private hideMonsters(): void
    {
        this.scene.cameras.main.setBackgroundColor(LevelTransitionSequence.STAGE_COLOR_TRANSITION);
        this.createReverseExplosions();
        this.monsterManager.hideForLevelTransition();
        this.phase = "restore-background";
    }

    private restoreBackground(): void
    {
        this.scene.cameras.main.setBackgroundColor(LevelTransitionSequence.STAGE_COLOR_NORMAL);
        this.phase = "fine-align-player";
    }

    private fineAlignPlayer(): void
    {
        const horizontalDistance = this.player.getHorizontalDistanceFrom(this.nextPlayerPosition.x);
        const verticalDistance = this.player.getVerticalDistanceFrom(this.nextPlayerPosition.y);

        // The transition only needs one axis to line up before the air bonus
        // starts. This preserves the deliberate diagonal shortcut in the route.
        if (verticalDistance === 0 || horizontalDistance === 0) {
            this.phase = "convert-air-to-score";
            return;
        }

        if (Math.abs(verticalDistance) < Math.abs(horizontalDistance)) {
            this.player.moveBodyY(verticalDistance > 0 ? -1 : 1);
        }
        else {
            this.player.moveBodyX(horizontalDistance > 0 ? -1 : 1);
        }
    }

    private convertAirToScore(currentAirLevel: number): LevelTransitionResult
    {
        if (currentAirLevel > 0) {
            this.movementCounter = LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS;
            return {
                ...this.createResult(),
                scoreDelta: GameSessionConstants.END_LEVEL_SCORE_STEP,
                airDelta: -GameSessionConstants.END_LEVEL_AIR_STEP,
                airChanged: true
            };
        }

        this.phase = "move-player-to-next-level";
        return {
            ...this.createResult(),
            airCleared: true
        };
    }

    private movePlayerToNextLevel(): void
    {
        this.movementCounter -= 1;

        if (this.movementCounter > 0) {
            return;
        }

        this.movementCounter = LEVEL_TRANSITION_PLAYER_MOVE_DELAY_STEPS;

        const horizontalDistance = this.player.getHorizontalDistanceFrom(this.nextPlayerPosition.x);
        const verticalDistance = this.player.getVerticalDistanceFrom(this.nextPlayerPosition.y);

        if (verticalDistance === 0 && horizontalDistance === 0) {
            this.phase = "refill-air";
            return;
        }

        if (verticalDistance === 0) {
            this.movePlayerHorizontallyTowardTarget(horizontalDistance);
            return;
        }

        this.movePlayerVerticallyTowardTarget(verticalDistance);
    }

    private movePlayerHorizontallyTowardTarget(horizontalDistance: number): void
    {
        if (Math.abs(horizontalDistance) < LEVEL_TRANSITION_PLAYER_TILE_STEP_PX) {
            this.player.setBodyX(this.nextPlayerPosition.x);
            this.phase = "refill-air";
            return;
        }

        this.player.moveBodyX(horizontalDistance > 0
            ? -LEVEL_TRANSITION_PLAYER_TILE_STEP_PX
            : LEVEL_TRANSITION_PLAYER_TILE_STEP_PX);
    }

    private movePlayerVerticallyTowardTarget(verticalDistance: number): void
    {
        if (Math.abs(verticalDistance) < LEVEL_TRANSITION_PLAYER_TILE_STEP_PX) {
            this.player.setBodyY(this.nextPlayerPosition.y);
            this.phase = "refill-air";
            return;
        }

        this.player.moveBodyY(verticalDistance > 0
            ? -LEVEL_TRANSITION_PLAYER_TILE_STEP_PX
            : LEVEL_TRANSITION_PLAYER_TILE_STEP_PX);
    }

    private refillAir(currentAirLevel: number): LevelTransitionResult
    {
        if (currentAirLevel < GameSessionConstants.DEFAULT_AIR_LEVEL) {
            return {
                ...this.createResult(),
                airDelta: GameSessionConstants.END_LEVEL_AIR_STEP,
                airChanged: true
            };
        }

        this.phase = "load-next-level";
        return this.createResult();
    }

    private createReverseExplosions(): void
    {
        this.destroyReverseExplosions();

        for (const position of this.monsterManager.getCurrentPositions()) {
            const explosion = this.scene.add.sprite(position.x, position.y, LevelTransitionSequence.REVERSE_EXPLOSION_TEXTURE, 0)
                .setOrigin(0, 0)
                .setDepth(LevelTransitionSequence.REVERSE_EXPLOSION_DEPTH);

            this.reverseExplosions.push(explosion);
        }

        this.reverseExplosionFrameAccumulatorMs = 0;
        this.reverseExplosionFrameIndex = 0;
    }

    private updateReverseExplosions(deltaMs: number): void
    {
        if (this.reverseExplosions.length === 0) {
            return;
        }

        this.reverseExplosionFrameAccumulatorMs += deltaMs;

        while (this.reverseExplosionFrameAccumulatorMs >= EXPLOSION_EFFECT_FRAME_DURATION_MS) {
            this.reverseExplosionFrameAccumulatorMs -= EXPLOSION_EFFECT_FRAME_DURATION_MS;
            this.reverseExplosionFrameIndex += 1;

            if (this.reverseExplosionFrameIndex >= EXPLOSION_EFFECT_FRAME_COUNT) {
                this.destroyReverseExplosions();
                return;
            }

            for (const explosion of this.reverseExplosions) {
                explosion.setFrame(this.reverseExplosionFrameIndex);
            }
        }
    }

    private destroyReverseExplosions(): void
    {
        for (const explosion of this.reverseExplosions) {
            explosion.destroy();
        }

        this.reverseExplosions.length = 0;
    }

    private createResult(): LevelTransitionResult
    {
        return {
            scoreDelta: 0,
            airDelta: 0,
            airChanged: false,
            airCleared: false,
            nextLevelReady: false
        };
    }
}
