var GameController =
{
    // The current game state
    gameState : null,
    score : 0,
    hiScore : null,
    lives : 3,

    update : function()
    {
        switch(this.gameState)
        {
            case GameStates.LOAD_INTRODUCTION:
                Level.displayIntroduction();

                // If the user pressed a key, start a new game
                game.input.keyboard.onPressCallback = function(key)
                {
                    Level.removeIntroduction();
                    game.input.keyboard.onPressCallback = null;

                    if (key == 'h')
                        GameController.gameState = GameStates.LOAD_HELP;
                    else
                        GameController.gameState = GameStates.LOAD_LEVEL;
                };

                this.gameState = GameStates.INTRODUCTION;
                break;

            // The player has finished the level, go to the next level
            case GameStates.LOAD_HELP:
                Level.displayInstructions();
                this.gameState = GameStates.HELP;

                break;

            // The player has finished the level, go to the next level
            case GameStates.END_LEVEL:
                Level.goToNext();
                break;

            // The player has finished the game
            case GameStates.END_GAME:
                Level.endGame();
                break;

            // Load level's objects
            case GameStates.LOAD_LEVEL:
                Level.load();
                HUD.update();
                this.gameState = GameStates.DISPLAY_LEVEL;
                break;

            // Display progressively the level
            case GameStates.DISPLAY_LEVEL:
                Level.display();
                break;

            // Before displaying monsters, show explosions
            case GameStates.START_LEVEL:
                Level.displayMonsters();
                break;

            // The game has ended, reset game and show game over
            case GameStates.SHOW_GAME_OVER:
                Level.resetGame();
                Level.displayGameOver();

                // If the user pressed a key, show the introduction
                game.input.keyboard.onPressCallback = function( ){
                    game.input.keyboard.onPressCallback = null;
                    Level.gameOver.destroy();
                    GameController.gameState = GameStates.LOAD_INTRODUCTION;
                };

                this.gameState = GameStates.GAME_OVER;
                break;

            case GameStates.PLAYING:
                HUD.updateAirLevel();
                HUD.displayBonusMan();
                Level.updateMonsters();
                Player.update();
                break;

        }

    }

}
