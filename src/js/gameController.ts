import { GameStates, type GameState } from "./gameStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { ScreenManager } from "./screenManager.ts";
import { EndGameSequence } from "./endGameSequence.ts";
import { HUD } from "./HUD.ts";
import { Player } from "./player.ts";
import { Level } from "./level.ts";

class GameControllerController
{
    // The current game state.
    public gameState: GameState | null = null;

    // Runtime score data.
    public score = 0;
    public hiScore: any = 0;
    public lives = LevelConstants.INITIAL_LIVES;

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
        switch(this.gameState)
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
                controller.gameState = GameStates.LOAD_HELP;
            else
                controller.gameState = GameStates.LOAD_LEVEL;
        };

        this.gameState = GameStates.INTRODUCTION;
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
        this.gameState = GameStates.HELP;
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
        this.gameState = GameStates.DISPLAY_LEVEL;
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
            controller.gameState = GameStates.LOAD_INTRODUCTION;
        };

        this.gameState = GameStates.GAME_OVER;
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
