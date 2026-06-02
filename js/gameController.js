var GameController =
{
    // The current game state.
    gameState : null,

    // Runtime score data.
    score : 0,
    hiScore : null,
    lives : LevelConstants.INITIAL_LIVES,

    /**
     * Main game loop entry point.
     *
     * Phaser calls updateGame() in main.js once per frame, and updateGame()
     * delegates here. GameController does not implement the gameplay itself:
     * it only decides which subsystem should run according to the current game
     * state.
     */
    update : function()
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
    },

    /**
     * Show the title screen once, then wait for a key press.
     *
     * Pressing 'h' opens the help screen. Any other key starts the first level.
     * After the callback is installed, the game moves to INTRODUCTION. That
     * state intentionally does nothing while the title screen waits for input.
     */
    updateLoadIntroduction : function()
    {
        ScreenManager.displayIntroduction();

        // If the user pressed a key, start a new game or display help.
        game.input.keyboard.onPressCallback = function(key)
        {
            ScreenManager.removeIntroduction();
            game.input.keyboard.onPressCallback = null;

            if (key == 'h')
                GameController.gameState = GameStates.LOAD_HELP;
            else
                GameController.gameState = GameStates.LOAD_LEVEL;
        };

        this.gameState = GameStates.INTRODUCTION;
    },

    /**
     * Show the help screen once.
     *
     * The input callback that leaves the help screen is currently owned by
     * ScreenManager.displayInstructions(), so this state only delegates the display.
     */
    updateLoadHelp : function()
    {
        ScreenManager.displayInstructions();
        this.gameState = GameStates.HELP;
    },

    /**
     * Run the end-of-level transition.
     *
     * The actual transition sequence is handled by LevelTransition through
     * Level.goToNext(). This state keeps running until the transition object
     * decides to move the game to the next state.
     */
    updateEndLevel : function()
    {
        Level.goToNext();
    },

    /**
     * Run the final end-game sequence.
     *
     * The actual frame-by-frame sequence is handled by EndGameSequence.
     */
    updateEndGame : function()
    {
        EndGameSequence.update();
    },

    /**
     * Load all objects for the current level, refresh the HUD, then start the
     * progressive level reveal.
     */
    updateLoadLevel : function()
    {
        Level.load();
        HUD.update();
        this.gameState = GameStates.DISPLAY_LEVEL;
    },

    /**
     * Continue the progressive reveal of the level.
     *
     * Level.display() is responsible for switching to the next state when the
     * reveal has finished.
     */
    updateDisplayLevel : function()
    {
        Level.display();
    },

    /**
     * Continue the monster reveal sequence before gameplay starts.
     *
     * Level.displayMonsters() is responsible for switching to PLAYING when the
     * sequence has finished.
     */
    updateStartLevel : function()
    {
        Level.displayMonsters();
    },

    /**
     * Reset the game and show the game-over screen once, then wait for a key
     * press before returning to the introduction.
     */
    updateShowGameOver : function()
    {
        Level.resetGame();
        ScreenManager.displayGameOver();

        // If the user pressed a key, show the introduction again.
        game.input.keyboard.onPressCallback = function()
        {
            game.input.keyboard.onPressCallback = null;
            ScreenManager.removeGameOver();
            GameController.gameState = GameStates.LOAD_INTRODUCTION;
        };

        this.gameState = GameStates.GAME_OVER;
    },

    /**
     * Main gameplay frame.
     *
     * The order is preserved from the previous implementation:
     * 1. decrease/update the air bar;
     * 2. display the bonus man when relevant;
     * 3. update monsters;
     * 4. update the player.
     */
    updatePlaying : function()
    {
        HUD.updateAirLevel();
        HUD.displayBonusMan();
        Level.updateMonsters();
        Player.update();
    }
};
