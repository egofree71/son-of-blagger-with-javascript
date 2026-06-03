import { GameStates, type GameState } from "./gameStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { ScreenManager } from "./screenManager.ts";
import { EndGameSequence } from "./endGameSequence.ts";
import { HUD } from "./HUD.ts";
import { Player } from "./player.ts";
import { Level } from "./level.ts";

class GameControllerController
{
    // The current game state is now stored privately. Other modules should use
    // setState() for transitions, while read-only checks can keep using the
    // gameState getter.
    private currentGameState: GameState | null = null;

    // Runtime score data.
    private currentScore = 0;
    private currentHiScore = 0;
    private currentLives: number = LevelConstants.INITIAL_LIVES;

    public get gameState(): GameState | null
    {
        return this.currentGameState;
    }

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

    public setState(gameState: GameState): void
    {
        this.currentGameState = gameState;
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
        ScreenManager.displayIntroduction();

        const controller = this;

        // If the user pressed a key, start a new game or display help.
        game.input.keyboard.onPressCallback = function(key: string)
        {
            ScreenManager.removeIntroduction();
            game.input.keyboard.onPressCallback = null;

            if (key == 'h')
                controller.setState(GameStates.LOAD_HELP);
            else
                controller.setState(GameStates.LOAD_LEVEL);
        };

        this.setState(GameStates.INTRODUCTION);
    }

    /**
     * Show the help screen once.
     *
     * The input callback that leaves the help screen is currently owned by
     * ScreenManager.displayInstructions(), so this state only delegates the display.
     */
    private updateLoadHelp(): void
    {
        ScreenManager.displayInstructions();
        this.setState(GameStates.HELP);
    }

    /**
     * Run the end-of-level transition.
     *
     * The actual transition sequence is handled by LevelTransition through
     * Level.goToNext(). This state keeps running until the transition object
     * decides to move the game to the next state.
     */
    private updateEndLevel(): void
    {
        Level.goToNext();
    }

    /**
     * Run the final end-game sequence.
     *
     * The actual frame-by-frame sequence is handled by EndGameSequence.
     */
    private updateEndGame(): void
    {
        EndGameSequence.update();
    }

    /**
     * Load all objects for the current level, refresh the HUD, then start the
     * progressive level reveal.
     */
    private updateLoadLevel(): void
    {
        Level.load();
        HUD.update();
        this.setState(GameStates.DISPLAY_LEVEL);
    }

    /**
     * Continue the progressive reveal of the level.
     *
     * Level.display() is responsible for switching to the next state when the
     * reveal has finished.
     */
    private updateDisplayLevel(): void
    {
        Level.display();
    }

    /**
     * Continue the monster reveal sequence before gameplay starts.
     *
     * Level.displayMonsters() is responsible for switching to PLAYING when the
     * sequence has finished.
     */
    private updateStartLevel(): void
    {
        Level.displayMonsters();
    }

    /**
     * Reset the game and show the game-over screen once, then wait for a key
     * press before returning to the introduction.
     */
    private updateShowGameOver(): void
    {
        Level.resetGame();
        ScreenManager.displayGameOver();

        const controller = this;

        // If the user pressed a key, show the introduction again.
        game.input.keyboard.onPressCallback = function()
        {
            game.input.keyboard.onPressCallback = null;
            ScreenManager.removeGameOver();
            controller.setState(GameStates.LOAD_INTRODUCTION);
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
        HUD.updateAirLevel();
        HUD.displayBonusMan();
        Level.updateMonsters();
        Player.update();
    }
}

export const GameController = new GameControllerController();
