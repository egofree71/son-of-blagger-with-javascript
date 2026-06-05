import { LevelConstants } from "./levelConstants.ts";
import { Util } from "./util.ts";
import { Player, type PlayerController } from "./player.ts";
import { Level, type LevelController } from "./level.ts";

const PHASE_PREPARE_NEXT_LEVEL = 1;
const PHASE_HIDE_MONSTERS = 2;
const PHASE_RESTORE_BACKGROUND = 3;
const PHASE_FINE_ALIGN_PLAYER = 4;
const PHASE_CONVERT_AIR_TO_SCORE = 5;
const PHASE_MOVE_PLAYER_TO_NEXT_LEVEL = 6;
const PHASE_REFILL_AIR = 7;
const PHASE_LOAD_NEXT_LEVEL = 8;

type LevelTransitionPhase =
    | typeof PHASE_PREPARE_NEXT_LEVEL
    | typeof PHASE_HIDE_MONSTERS
    | typeof PHASE_RESTORE_BACKGROUND
    | typeof PHASE_FINE_ALIGN_PLAYER
    | typeof PHASE_CONVERT_AIR_TO_SCORE
    | typeof PHASE_MOVE_PLAYER_TO_NEXT_LEVEL
    | typeof PHASE_REFILL_AIR
    | typeof PHASE_LOAD_NEXT_LEVEL;

export interface LevelTransitionResult
{
    /** Score points earned during this frame, usually while converting air. */
    scoreDelta: number;

    /** True when the visible air bar should be redrawn from Level.airLevel. */
    airChanged: boolean;

    /** True when the air bar should be cleared visually. */
    airCleared: boolean;

    /** True when the next level has just been loaded and GameController should continue the level-start flow. */
    nextLevelLoaded: boolean;
}

/**
 * Handles the transition played when the player completes a level.
 *
 * The transition is a small frame-by-frame state machine. It keeps the same
 * numeric phases as the previous implementation, but the runtime state now
 * lives inside a class instance instead of a large object literal.
 *
 * The exported name remains `LevelTransition`, so the rest of the game can keep
 * calling `LevelTransition.update()` and `LevelTransition.reset()` without any
 * API change.
 */
export class LevelTransitionController
{
    constructor(
        private readonly level: LevelController = Level,
        private readonly player: PlayerController = Player
    )
    {
    }

    // 1) Increase Level.level and read the player spawn position of the next level from the Tiled map.
    readonly PHASE_PREPARE_NEXT_LEVEL = PHASE_PREPARE_NEXT_LEVEL;

    // 2) Flash the background red, hide old monsters and play reverse explosions at their positions.
    readonly PHASE_HIDE_MONSTERS = PHASE_HIDE_MONSTERS;

    // 3) Restore the normal grey background before moving the player.
    readonly PHASE_RESTORE_BACKGROUND = PHASE_RESTORE_BACKGROUND;

    // 4) Move the player one pixel at a time until one axis is aligned with the next-level spawn.
    readonly PHASE_FINE_ALIGN_PLAYER = PHASE_FINE_ALIGN_PLAYER;

    // 5) Convert remaining air into score, exactly like the original implementation.
    readonly PHASE_CONVERT_AIR_TO_SCORE = PHASE_CONVERT_AIR_TO_SCORE;

    // 6) Move the player toward the next-level spawn using 16-pixel tile-sized steps.
    readonly PHASE_MOVE_PLAYER_TO_NEXT_LEVEL = PHASE_MOVE_PLAYER_TO_NEXT_LEVEL;

    // 7) Refill the air bar before the next level starts.
    readonly PHASE_REFILL_AIR = PHASE_REFILL_AIR;

    // 8) Load the next level objects, update the HUD and give the player a bonus man.
    readonly PHASE_LOAD_NEXT_LEVEL = PHASE_LOAD_NEXT_LEVEL;

    // Delay, in frames, between each 16-pixel movement during the long player movement phase.
    // This keeps the transition speed identical to the previous counterEndLevel = 4 behaviour.
    readonly MOVE_DELAY = 4;

    // Current phase of the transition state machine.
    private phase: LevelTransitionPhase = PHASE_PREPARE_NEXT_LEVEL;

    // Generic frame counter used by the tile-sized movement phase.
    private counter = 4;

    // Target player position in the next level.
    // These coordinates are calculated once at the beginning of the transition.
    private nextPlayerPositionX = 0;
    private nextPlayerPositionY = 0;

    private createResult(): LevelTransitionResult
    {
        return {
            scoreDelta: 0,
            airChanged: false,
            airCleared: false,
            nextLevelLoaded: false
        };
    }

    /**
     * Resets the transition to its initial state.
     *
     * This is called after the next level has been loaded, so the object is ready
     * for the next time the player reaches a safe.
     */
    reset(): void
    {
        this.phase = this.PHASE_PREPARE_NEXT_LEVEL;
        this.counter = this.MOVE_DELAY;
        this.nextPlayerPositionX = 0;
        this.nextPlayerPositionY = 0;
    }

    /**
     * Advances the transition by one frame.
     *
     * GameController calls this while the game state is GameStates.END_LEVEL.
     */
    update(): LevelTransitionResult
    {
        switch(this.phase)
        {
            case this.PHASE_PREPARE_NEXT_LEVEL:
                this.prepareNextLevel();
                return this.createResult();

            case this.PHASE_HIDE_MONSTERS:
                this.hideMonsters();
                return this.createResult();

            case this.PHASE_RESTORE_BACKGROUND:
                this.restoreBackground();
                return this.createResult();

            case this.PHASE_FINE_ALIGN_PLAYER:
                this.fineAlignPlayer();
                return this.createResult();

            case this.PHASE_CONVERT_AIR_TO_SCORE:
                return this.convertAirToScore();

            case this.PHASE_MOVE_PLAYER_TO_NEXT_LEVEL:
                this.movePlayerToNextLevel();
                return this.createResult();

            case this.PHASE_REFILL_AIR:
                return this.refillAir();

            case this.PHASE_LOAD_NEXT_LEVEL:
                return this.loadNextLevel();
        }

        return this.createResult();
    }

    /**
     * Moves the logical level index to the next level and retrieves the matching
     * player spawn object from the Tiled map.
     *
     * The player Y offset is preserved from the original code. It compensates for
     * the difference between the Tiled object position and the Phaser body/sprite
     * position used by the player.
     */
    private prepareNextLevel(): void
    {
        this.level.advanceToNextLevel();

        var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, this.level.level, LevelConstants.OBJECT_LAYER_PLAYER);
        this.nextPlayerPositionX = results[0].x;
        this.nextPlayerPositionY = results[0].y - LevelConstants.PLAYER_TILED_Y_OFFSET;

        this.phase = this.PHASE_HIDE_MONSTERS;
    }

    /**
     * Ends the current level visually:
     * - turn the background red;
     * - hide all monsters from the completed level;
     * - play a reverse explosion where each monster was.
     *
     * This keeps the little visual flourish from the original transition, but
     * isolates it from Level.js.
     */
    private hideMonsters(): void
    {
        game.stage.backgroundColor = LevelConstants.STAGE_COLOR_TRANSITION;

        this.level.hideMonstersWithReverseExplosions();

        this.phase = this.PHASE_RESTORE_BACKGROUND;
    }

    /**
     * Restores the normal background color.
     *
     * The old code had a counter here, but it also advanced to the next step in
     * the same update. In practice there was no real wait, so this method keeps
     * the effective behaviour: restore the color and continue immediately.
     */
    private restoreBackground(): void
    {
        game.stage.backgroundColor = LevelConstants.STAGE_COLOR_NORMAL;
        this.phase = this.PHASE_FINE_ALIGN_PLAYER;
    }

    /**
     * Performs a precise one-pixel alignment before the larger tile-based move.
     *
     * The transition first moves the player on the axis where the distance is
     * smaller. Once either the X axis or the Y axis is aligned, the sequence can
     * continue to the score conversion phase.
     *
     * This slightly unusual "stop when one axis is aligned" rule is intentional:
     * it preserves the original behaviour of the game.
     */
    private fineAlignPlayer(): void
    {
        var horizontalDistance = this.player.getHorizontalDistanceFrom(this.nextPlayerPositionX);
        var verticalDistance = this.player.getVerticalDistanceFrom(this.nextPlayerPositionY);

        // Preserve the original behaviour: leave this phase as soon as one axis is aligned.
        if (verticalDistance == 0 || horizontalDistance == 0)
        {
            this.phase = this.PHASE_CONVERT_AIR_TO_SCORE;
            return;
        }

        // Move along the axis which has the smaller remaining distance.
        if (Math.abs(verticalDistance) < Math.abs(horizontalDistance))
        {
            if (verticalDistance > 0)
                this.player.moveBodyY(-1);
            else
                this.player.moveBodyY(1);
        }
        else
        {
            if (horizontalDistance > 0)
                this.player.moveBodyX(-1);
            else
                this.player.moveBodyX(1);
        }
    }

    /**
     * Converts the remaining air into score.
     *
     * Every frame, the air bar is reduced and the score is increased using the preserved transition constants.
     * Once air reaches zero, the air display is cleared and the player starts
     * moving toward the next-level spawn.
     */
    private convertAirToScore(): LevelTransitionResult
    {
        const result = this.createResult();

        if (this.level.airLevel > 0)
        {
            this.level.decreaseAir(LevelConstants.END_LEVEL_TRANSITION_AIR_DECREMENT);
            result.scoreDelta = LevelConstants.END_LEVEL_TRANSITION_SCORE_INCREMENT;
            result.airChanged = true;
        }
        else
        {
            result.airCleared = true;
            this.phase = this.PHASE_MOVE_PLAYER_TO_NEXT_LEVEL;
        }

        // Prepare the frame delay used by the following movement phase.
        this.counter = this.MOVE_DELAY;
        return result;
    }

    /**
     * Moves the player toward the next-level spawn.
     *
     * This is the visible "travel" part of the transition. The player is moved
     * every MOVE_DELAY frames, by one tile-sized step at a time, which corresponds to the
     * tile size used by the map.
     *
     * If the remaining distance is smaller than one tile-sized step, the player is snapped
     * exactly to the target position to avoid overshooting.
     */
    private movePlayerToNextLevel(): void
    {
        this.counter -= 1;

        if (this.counter > 0)
            return;

        this.counter = this.MOVE_DELAY;

        var horizontalDistance = this.player.getHorizontalDistanceFrom(this.nextPlayerPositionX);
        var verticalDistance = this.player.getVerticalDistanceFrom(this.nextPlayerPositionY);

        if (verticalDistance == 0 && horizontalDistance == 0)
        {
            this.phase = this.PHASE_REFILL_AIR;
            return;
        }

        if (verticalDistance == 0)
        {
            if (Math.abs(horizontalDistance) < LevelConstants.END_LEVEL_TRANSITION_TILE_STEP)
            {
                this.player.setBodyX(this.nextPlayerPositionX);
                this.phase = this.PHASE_REFILL_AIR;
                return;
            }

            if (horizontalDistance > 0)
                this.player.moveBodyX(-LevelConstants.END_LEVEL_TRANSITION_TILE_STEP);
            else
                this.player.moveBodyX(LevelConstants.END_LEVEL_TRANSITION_TILE_STEP);
        }
        else
        {
            if (Math.abs(verticalDistance) < LevelConstants.END_LEVEL_TRANSITION_TILE_STEP)
            {
                this.player.setBodyY(this.nextPlayerPositionY);
                this.phase = this.PHASE_REFILL_AIR;
                return;
            }

            if (verticalDistance > 0)
                this.player.moveBodyY(-LevelConstants.END_LEVEL_TRANSITION_TILE_STEP);
            else
                this.player.moveBodyY(LevelConstants.END_LEVEL_TRANSITION_TILE_STEP);
        }
    }

    /**
     * Refills the air bar before starting the next level.
     *
     * The air bar goes back to the default air level, using the same increment as before.
     */
    private refillAir(): LevelTransitionResult
    {
        const result = this.createResult();

        if (this.level.airLevel < LevelConstants.DEFAULT_AIR_LEVEL)
        {
            this.level.increaseAir(LevelConstants.END_LEVEL_TRANSITION_AIR_DECREMENT);
            result.airChanged = true;
        }
        else
        {
            this.phase = this.PHASE_LOAD_NEXT_LEVEL;
        }

        return result;
    }

    /**
     * Loads the next level and hands control back to the normal start-level flow.
     *
     * Level.load() resets level-related data, creates monsters for the new level
     * and positions the player. HUD.update() refreshes score, lives, level and air.
     *
     * After every completed level, Level.bonusMan is set to true so the HUD shows
     * the bonus man reward animation on the next level.
     */
    private loadNextLevel(): LevelTransitionResult
    {
        const result = this.createResult();

        this.level.load(this.player);

        // On every new level, the user gets a bonus man.
        this.level.enableBonusMan();

        this.reset();
        result.nextLevelLoaded = true;

        return result;
    }
}

export const LevelTransition = new LevelTransitionController();

