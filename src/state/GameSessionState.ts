import type { HUDState } from "../ui/HUDState";
import { GameSessionConstants } from "./gameSessionConstants";
import { LevelState } from "./LevelState";

/**
 * Session-wide state for the Phaser 4 prototype.
 *
 * This is the first small replacement for the old Phaser 2 GameController data:
 * it owns score, hi-score, lives and the current LevelState, while GameScene
 * still orchestrates actual Phaser objects. Later transitions can grow from
 * this class without keeping temporary counters scattered through GameScene.
 */
export class GameSessionState
{
    private currentScore = 0;
    private currentHiScore = GameSessionState.loadStoredHiScore();
    private currentLives: number = GameSessionConstants.INITIAL_LIVES;
    private currentLevelState = new LevelState(GameSessionConstants.INITIAL_LEVEL);

    /**
     * Mutable values for the currently active level run.
     */
    get currentLevel(): LevelState
    {
        return this.currentLevelState;
    }

    /**
     * Current score displayed by the HUD.
     */
    get score(): number
    {
        return this.currentScore;
    }

    /**
     * Current stored hi-score displayed by the HUD.
     */
    get hiScore(): number
    {
        return this.currentHiScore;
    }

    /**
     * Remaining lives for the current prototype session.
     */
    get lives(): number
    {
        return this.currentLives;
    }

    /**
     * Resets score, lives and level for a fresh run while keeping the hi-score.
     */
    resetForNewGame(): void
    {
        this.currentScore = 0;
        this.currentLives = GameSessionConstants.INITIAL_LIVES;
        this.currentLevelState = new LevelState(GameSessionConstants.INITIAL_LEVEL);
    }

    /**
     * Returns whether the current run has no lives left.
     */
    hasNoLives(): boolean
    {
        return this.currentLives <= 0;
    }

    /**
     * Adds an arbitrary score delta to the current session.
     */
    addScore(points: number): void
    {
        this.currentScore += points;
    }

    /**
     * Adds the original key-collection score increment.
     */
    addKeyScore(): void
    {
        this.addScore(GameSessionConstants.KEY_SCORE_INCREMENT);
    }

    /**
     * Returns whether another level exists after the current one.
     */
    hasNextLevel(): boolean
    {
        return this.currentLevel.levelNumber < GameSessionConstants.LEVEL_COUNT;
    }

    /**
     * Returns the one-based number of the level following the current one.
     */
    get nextLevelNumber(): number
    {
        return Math.min(this.currentLevel.levelNumber + 1, GameSessionConstants.LEVEL_COUNT);
    }

    /**
     * Creates a fresh state for the next level and grants the transition reward.
     */
    advanceToNextLevelWithBonusMan(): void
    {
        this.currentLevelState = new LevelState(this.nextLevelNumber);
        this.currentLevelState.enableBonusMan();
    }

    /**
     * Applies death consequences that affect session-level data.
     *
     * Bonus-man support is already represented so the later transition port has
     * a home, even though the current level-1 prototype never grants one yet.
     */
    consumeBonusManOrLife(): void
    {
        if (this.currentLevel.consumeBonusMan()) {
            return;
        }

        this.currentLives = Math.max(0, this.currentLives - 1);
    }

    /**
     * Updates localStorage when the current score beats the stored hi-score.
     */
    updateHiScoreIfNeeded(): void
    {
        if (this.currentScore <= this.currentHiScore) {
            return;
        }

        this.currentHiScore = this.currentScore;
        window.localStorage.setItem("hiScore", String(this.currentHiScore));
    }

    /**
     * Creates the exact payload consumed by HUDScene.
     */
    toHUDState(): HUDState
    {
        return {
            lives: this.currentLives,
            score: this.currentScore,
            hiScore: this.currentHiScore,
            levelNumber: this.currentLevel.levelNumber,
            airLevel: this.currentLevel.airLevel,
            hasBonusMan: this.currentLevel.hasBonusMan
        };
    }

    private static loadStoredHiScore(): number
    {
        const storedHiScore = window.localStorage.getItem("hiScore");
        const parsedHiScore = storedHiScore ? Number(storedHiScore) : 0;

        return Number.isFinite(parsedHiScore) ? parsedHiScore : 0;
    }
}
