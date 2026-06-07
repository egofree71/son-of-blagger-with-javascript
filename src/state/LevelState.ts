import { Data } from "../data/gameData";
import { GameSessionConstants } from "./gameSessionConstants";

/**
 * Runtime state for the currently loaded level.
 *
 * The mutable level values live here: level number, keys, exit, air and bonus
 * man. Phaser objects still live in GameScene and the entity classes.
 */
export class LevelState
{
    private readonly requiredKeys: number;
    private collectedKeys = 0;
    private reachedExit = false;
    private air: number = GameSessionConstants.DEFAULT_AIR_LEVEL;
    private bonusManEnabled = false;
    private airDecreaseAccumulatorMs = 0;

    /**
     * @param currentLevelNumber One-based level number used to read level data.
     */
    constructor(private readonly currentLevelNumber: number)
    {
        this.requiredKeys = Data.levels[currentLevelNumber - 1]?.[0] ?? 0;
    }

    /**
     * Current level number, using the original one-based numbering.
     */
    get levelNumber(): number
    {
        return this.currentLevelNumber;
    }

    /**
     * Number of keys that must be collected before the exit is open.
     */
    get keysNeeded(): number
    {
        return this.requiredKeys;
    }

    /**
     * Number of keys collected in the current level run.
     */
    get keysCollected(): number
    {
        return this.collectedKeys;
    }

    /**
     * Remaining air value used by the HUD mask.
     */
    get airLevel(): number
    {
        return this.air;
    }

    /**
     * True when the exit has already been touched.
     */
    get exitReached(): boolean
    {
        return this.reachedExit;
    }

    /**
     * True when the bonus-man sprite should be displayed by the HUD.
     */
    get hasBonusMan(): boolean
    {
        return this.bonusManEnabled;
    }

    /**
     * Records one collected key and clamps the count to the level definition.
     */
    collectKey(): void
    {
        this.collectedKeys = Math.min(this.collectedKeys + 1, this.requiredKeys);
    }

    /**
     * Debug helper used to open the current level without walking the whole map.
     */
    collectAllKeysForDebug(): void
    {
        this.collectedKeys = this.requiredKeys;
    }

    /**
     * Marks the exit as touched.
     */
    markExitReached(): void
    {
        this.reachedExit = true;
    }

    /**
     * Returns whether the player has collected enough keys to use the exit.
     */
    hasCollectedAllKeys(): boolean
    {
        return this.collectedKeys >= this.requiredKeys;
    }

    /**
     * Advances the air timer and consumes air when due.
     *
     * The air delay is defined in logical 60 FPS frames but applied with elapsed
     * milliseconds, so the air bar drains at the same speed on high-refresh
     * displays.
     */
    consumeAirWhenDue(deltaMs: number): boolean
    {
        if (this.air <= 0) {
            return false;
        }

        const intervalMs = GameSessionConstants.AIR_DECREASE_DELAY * 1000 / GameSessionConstants.AIR_REFERENCE_FPS;
        this.airDecreaseAccumulatorMs += deltaMs;

        if (this.airDecreaseAccumulatorMs < intervalMs) {
            return false;
        }

        const decreaseSteps = Math.floor(this.airDecreaseAccumulatorMs / intervalMs);
        this.airDecreaseAccumulatorMs -= decreaseSteps * intervalMs;
        this.decreaseAir(decreaseSteps * GameSessionConstants.AIR_DECREASE_AMOUNT);
        return true;
    }

    /**
     * Resets level-run values after a death or debug reset.
     */
    resetRun(): void
    {
        this.collectedKeys = 0;
        this.reachedExit = false;
        this.resetAirLevel();
    }

    /**
     * Restores the full air bar and its frame counter.
     */
    resetAirLevel(): void
    {
        this.air = GameSessionConstants.DEFAULT_AIR_LEVEL;
        this.airDecreaseAccumulatorMs = 0;
    }

    /**
     * Decreases the air bar by a fixed amount during level transitions.
     */
    decreaseAir(amount: number): void
    {
        this.air = Math.max(0, this.air - amount);
    }

    /**
     * Refills the air bar by a fixed amount during level transitions.
     */
    increaseAir(amount: number): void
    {
        this.air = Math.min(GameSessionConstants.DEFAULT_AIR_LEVEL, this.air + amount);
    }

    /**
     * Clears the air accumulator when gameplay resumes after a transition.
     */
    resetAirTimer(): void
    {
        this.airDecreaseAccumulatorMs = 0;
    }

    /**
     * Enables the bonus-man display for the current level.
     */
    enableBonusMan(): void
    {
        this.bonusManEnabled = true;
    }

    /**
     * Consumes the bonus man if present and reports whether it was used.
     */
    consumeBonusMan(): boolean
    {
        if (!this.bonusManEnabled) {
            return false;
        }

        this.bonusManEnabled = false;
        return true;
    }

}
