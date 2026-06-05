import { GameStates, type GameState } from "./gameStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { ScreenManager, type ScreenManagerController } from "./screenManager.ts";
import { EndGameSequence } from "./endGameSequence.ts";
import { LevelRevealSequence } from "./levelRevealSequence.ts";
import { LevelTransition } from "./levelTransition.ts";
import { HUD } from "./HUD.ts";
import { Player } from "./player.ts";
import { Level } from "./level.ts";

export class GameControllerController
{
    constructor(private readonly screenManager: ScreenManagerController = ScreenManager)
    {
    }

    // The current game state is stored privately. Other modules should use
    // named transition methods instead of setting raw GameStates directly.
    private currentGameState: GameState | null = null;

    // Runtime score data.
    private currentScore = 0;
    private currentHiScore = 0;
    private currentLives: number = LevelConstants.INITIAL_LIVES;

    public get score(): number
    {
        return this.currentScore;
    }

    public get hiScore(): number
    {
        return this.currentHiScore;
    }

    public get lives(): number
    {
        return this.currentLives;
    }

    private setState(gameState: GameState): void
    {
        this.currentGameState = gameState;
    }

    public isPlaying(): boolean
    {
        return this.currentGameState == GameStates.PLAYING;
    }

    public loadIntroduction(): void
    {
        this.setState(GameStates.LOAD_INTRODUCTION);
    }

    public loadHelp(): void
    {
        this.setState(GameStates.LOAD_HELP);
    }

    public loadLevel(): void
    {
        this.setState(GameStates.LOAD_LEVEL);
    }

    public displayLevel(): void
    {
        this.setState(GameStates.DISPLAY_LEVEL);
    }

    public startLevel(): void
    {
        this.setState(GameStates.START_LEVEL);
    }

    public displayMonsters(): void
    {
        this.setState(GameStates.DISPLAYING_MONSTERS);
    }

    public startPlaying(): void
    {
        this.setState(GameStates.PLAYING);
    }

    public endLevel(): void
    {
        this.setState(GameStates.END_LEVEL);
    }

    public endGame(): void
    {
        this.setState(GameStates.END_GAME);
    }

    public killPlayer(): void
    {
        this.setState(GameStates.KILL_PLAYER);
    }

    public showGameOver(): void
    {
        this.setState(GameStates.SHOW_GAME_OVER);
    }

    public addScore(points: number): void
    {
        this.currentScore += points;
    }

    public loseLife(): void
    {
        this.currentLives -= 1;
    }

    public hasNoLives(): boolean
    {
        return this.currentLives == 0;
    }

    public resetScoreAndLives(): void
    {
        this.currentScore = 0;
        this.currentLives = LevelConstants.INITIAL_LIVES;
    }

    public loadHiScore(storedHiScore: string | null): void
    {
        this.currentHiScore = storedHiScore ? Number(storedHiScore) : 0;
    }

    public updateHiScoreIfNeeded(): void
    {
        if (this.currentScore > this.currentHiScore)
        {
            localStorage.setItem('hiScore', String(this.currentScore));
            this.currentHiScore = this.currentScore;
        }
    }

    /**
     * Main game loop entry point.
     *
     * Phaser calls updateGame() in main.js once per frame, and updateGame()
     * delegates here. GameController does not implement the gameplay itself:
     * it only decides which subsystem should run according to the current game
     * state.
     */
    public update(): void
    {
        switch(this.currentGameState)
        {
            case GameStates.LOAD_INTRODUCTION:
                this.updateLoadIntroduction();
                break;

            case GameStates.LOAD_HELP:
                this.updateLoadHelp();
                break;

            case GameStates.END_LEVEL:
                this.updateEndLevel();
                break;

            case GameStates.END_GAME:
                this.updateEndGame();
                break;

            case GameStates.LOAD_LEVEL:
                this.updateLoadLevel();
                break;

            case GameStates.DISPLAY_LEVEL:
                this.updateDisplayLevel();
                break;

            case GameStates.START_LEVEL:
                this.updateStartLevel();
                break;

            case GameStates.SHOW_GAME_OVER:
                this.updateShowGameOver();
                break;

            case GameStates.PLAYING:
                this.updatePlaying();
                break;
        }
    }

    /**
     * Show the title screen once, then wait for a key press.
     *
     * Pressing 'h' opens the help screen. Any other key starts the first level.
     * After the callback is installed, the game moves to INTRODUCTION. That
     * state intentionally does nothing while the title screen waits for input.
     */
    private updateLoadIntroduction(): void
    {
        this.screenManager.displayIntroduction();

        const controller = this;
        const screenManager = this.screenManager;

        // If the user pressed a key, start a new game or display help.
        game.input.keyboard.onPressCallback = function(key: string)
        {
            screenManager.removeIntroduction();
            game.input.keyboard.onPressCallback = null;

            if (key == 'h')
                controller.loadHelp();
            else
                controller.loadLevel();
        };

        this.setState(GameStates.INTRODUCTION);
    }

    /**
     * Show the help screen once.
     *
     * GameController owns the state transition that leaves the help screen.
     * ScreenManager only owns the visual screen and the temporary input callback.
     */
    private updateLoadHelp(): void
    {
        const controller = this;

        this.screenManager.displayInstructions(function(): void
        {
            controller.loadIntroduction();
        });

        this.setState(GameStates.HELP);
    }

    /**
     * Run the end-of-level transition.
     *
     * The actual transition sequence is handled by LevelTransition. This state
     * keeps running until the transition object reports that the next level has
     * been loaded.
     */
    private updateEndLevel(): void
    {
        const transitionResult = LevelTransition.update();

        if (transitionResult.scoreDelta > 0)
        {
            this.addScore(transitionResult.scoreDelta);
            HUD.displayScore(this.score);
        }

        if (transitionResult.airChanged)
            HUD.displayAirLevel(Level.airLevel);

        if (transitionResult.airCleared)
            HUD.clearAirLevel();

        if (transitionResult.nextLevelLoaded)
        {
            HUD.update(this.lives, this.score, this.hiScore, Level.level);
            this.startLevel();
        }
    }

    /**
     * Run the final end-game sequence.
     *
     * The actual frame-by-frame sequence is handled by EndGameSequence.
     */
    private updateEndGame(): void
    {
        const endGameResult = EndGameSequence.update(Level.airLevel);

        if (endGameResult.airDecreaseAmount > 0)
            Level.decreaseAir(endGameResult.airDecreaseAmount);

        if (endGameResult.scoreDelta > 0)
        {
            this.addScore(endGameResult.scoreDelta);
            HUD.displayScore(this.score);
        }

        if (endGameResult.airChanged)
            HUD.displayAirLevel(Level.airLevel);

        if (endGameResult.airCleared)
            HUD.clearAirLevel();

        if (endGameResult.airResetRequired)
            Level.resetAirLevel();

        if (endGameResult.finished)
            this.returnToIntroductionAfterEndGame();
    }

    /**
     * Applies the global consequences after the final congratulations sequence finishes.
     */
    private returnToIntroductionAfterEndGame(): void
    {
        this.updateHiScoreIfNeeded();
        this.resetScoreAndLives();
        this.resetVisualSequences();
        Level.resetGame();
        HUD.update(this.lives, this.score, this.hiScore, Level.level);
        HUD.displayAirLevel(Level.airLevel);
        this.loadIntroduction();
    }

    /**
     * Resets visual sequences that are not owned by Level.
     *
     * This keeps Level.resetGame() focused on level data instead of making it
     * know about end-level or end-game sequence objects.
     */
    private resetVisualSequences(): void
    {
        LevelTransition.reset();
        EndGameSequence.reset();
        LevelRevealSequence.reset();
    }

    /**
     * Load all objects for the current level, refresh the HUD, then start the
     * progressive level reveal.
     */
    private updateLoadLevel(): void
    {
        Level.load(Player);
        HUD.update(this.lives, this.score, this.hiScore, Level.level);
        this.displayLevel();
    }

    /**
     * Continue the progressive reveal of the level.
     *
     * GameController remains responsible for moving to the next state once the
     * reveal reports that it has finished.
     */
    private updateDisplayLevel(): void
    {
        if (LevelRevealSequence.update())
            this.startLevel();
    }

    /**
     * Continue the monster reveal sequence before gameplay starts.
     *
     * Level owns the monster reveal visuals, while GameController owns the game
     * state transitions around that sequence.
     */
    private updateStartLevel(): void
    {
        const controller = this;

        const revealStarted = Level.displayMonsters(function(): void
        {
            controller.startPlaying();
        });

        if (revealStarted)
            this.displayMonsters();
    }

    /**
     * Reset the game and show the game-over screen once, then wait for a key
     * press before returning to the introduction.
     */
    private updateShowGameOver(): void
    {
        this.updateHiScoreIfNeeded();
        this.resetScoreAndLives();
        this.resetVisualSequences();
        Level.resetGame();
        HUD.update(this.lives, this.score, this.hiScore, Level.level);
        this.screenManager.displayGameOver();

        const controller = this;
        const screenManager = this.screenManager;

        // If the user pressed a key, show the introduction again.
        game.input.keyboard.onPressCallback = function()
        {
            game.input.keyboard.onPressCallback = null;
            screenManager.removeGameOver();
            controller.loadIntroduction();
        };

        this.setState(GameStates.GAME_OVER);
    }

    /**
     * Main gameplay frame.
     *
     * The order is preserved from the previous implementation:
     * 1. decrease/update the air bar;
     * 2. display the bonus man when relevant;
     * 3. update monsters;
     * 4. update the player.
     */
    private updatePlaying(): void
    {
        this.updateAirLevelDuringGameplay();
        HUD.displayBonusMan(Level.bonusMan);

        // updateAirLevelDuringGameplay() can kill the player and leave PLAYING during this frame.
        // Preserve the previous behaviour: monsters are asked to update, but Level
        // skips their movement if gameplay has already stopped.
        Level.updateMonsters(this.isPlaying());

        if (!this.isPlaying()) return;

        const playerResult = Player.update(Level);

        if (playerResult.keyCollected)
        {
            this.addScore(LevelConstants.KEY_SCORE_INCREMENT);
            HUD.displayScore(this.score);
        }

        if (playerResult.playerKilled)
        {
            this.startPlayerDeath();
            return;
        }

        if (playerResult.exitReached)
        {
            if (Level.isLastLevel())
                this.endGame();
            else
                this.endLevel();
        }
    }

    /**
     * Handles the gameplay rule that consumes air and kills the player when air
     * reaches zero. HUD only owns the visual depletion counter and rendering.
     */
    private updateAirLevelDuringGameplay(): void
    {
        const airDecreaseAmount = HUD.consumeAirDecreaseAmount();

        if (airDecreaseAmount > 0)
            Level.decreaseAir(airDecreaseAmount);

        if (Level.airLevel <= 0)
        {
            this.startPlayerDeath();
            return;
        }

        HUD.displayAirLevel(Level.airLevel);
    }

    /**
     * Starts the player death animation and stops normal gameplay immediately.
     *
     * GameController owns the global death flow. Player and PlayerDeathSequence
     * only own the visual player animation.
     */
    private startPlayerDeath(): void
    {
        this.killPlayer();
        Player.kill((): void =>
        {
            this.finishPlayerDeath();
        });
    }

    /**
     * Applies the gameplay consequences after the death animation finishes.
     */
    private finishPlayerDeath(): void
    {
        this.consumeBonusManOrLife();

        HUD.displayLives(this.lives);
        Level.resetAirLevel();
        HUD.displayAirLevel(Level.airLevel);

        if (this.hasNoLives())
            this.showGameOver();
        else
            this.loadLevel();
    }

    /**
     * The bonus man prevents losing one life once, then disappears.
     */
    private consumeBonusManOrLife(): void
    {
        if (Level.consumeBonusMan())
        {
            HUD.hideBonusMan();
        }
        else
        {
            this.loseLife();
        }
    }

}

export const GameController = new GameControllerController();
