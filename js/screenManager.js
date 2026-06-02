/**
 * ScreenManager owns the non-gameplay screens.
 *
 * These methods used to live in Level, even though they do not load or update
 * a level. Moving them here keeps Level focused on actual level management
 * while preserving the original title/help/game-over behaviour.
 */
var ScreenManager =
{
    // Title screen objects.
    introductionLogo : null,
    fontIntroduction : null,

    // Game-over screen object.
    gameOver : null,

    /**
     * Display the introduction title screen.
     *
     * The black background still reuses Level.upperBlackRectangle because that
     * graphic object already exists and is also used by other screen sequences.
     */
    displayIntroduction : function()
    {
        // Draw a black rectangle behind the title.
        Level.upperBlackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
        Level.upperBlackRectangle.drawRect(0, 0, game.camera.width,  game.camera.height);

        // Display the title.
        this.introductionLogo = game.add.sprite(LevelConstants.TITLE_X, LevelConstants.TITLE_Y, LevelConstants.SPRITE_TITLE);
        this.introductionLogo.fixedToCamera = true;

        this.fontIntroduction = Util.drawFontText(LevelConstants.INTRO_PROMPT_TEXT, LevelConstants.INTRO_PROMPT_X, LevelConstants.INTRO_PROMPT_Y);
    },

    /**
     * Remove the introduction title screen.
     *
     * This intentionally preserves the old behaviour: the retro font is
     * cleared instead of destroying the image created by Util.drawFontText().
     */
    removeIntroduction : function()
    {
        if (this.introductionLogo)
        {
            this.introductionLogo.destroy();
            this.introductionLogo = null;
        }

        if (this.fontIntroduction)
        {
            this.fontIntroduction.clear();
            this.fontIntroduction = null;
        }
    },

    /**
     * Display a screen with instructions.
     *
     * Pressing any key destroys the help text and returns to the introduction.
     */
    displayInstructions : function()
    {
        // Draw a black rectangle.
        Level.upperBlackRectangle.beginFill(LevelConstants.BLACK_COLOR, 1);
        Level.upperBlackRectangle.drawRect(0, 0, game.stage.width, game.stage.height);

        var font = game.add.retroFont(LevelConstants.FONT_BLAGGER, 16, 16, Phaser.RetroFont.TEXT_SET2);
        font.setText ("Players control Slippery Sid, who is an\n" +
                      "espionage agent and son of blagger.\n" +
                      "Like the first game, the task is to \n" +
                      "collect a series of keys scattered \n" +
                      "around the level. Sid must navigate \n" +
                      "a series of platforms while jumping \n" +
                      "over robots that guard the keys. Once \n" +
                      "Sid collects all the keys, he can make\n" +
                      "his way to the next level by going\n" +
                      "through a doorway. Like his father, Sid\n" +
                      "has a limited time to perform this task,\n" +
                      "and he loses one of his lives if he\n" +
                      "falls long distances.\n" +
                      "\n"+
                      "Controls : left and right arrows \n" +
                      "to go left and right and space bar \nto jump.", true, 0, 6);

        var image = game.add.image(LevelConstants.HELP_TEXT_X, LevelConstants.HELP_TEXT_Y, font);
        image.tint = LevelConstants.HELP_TEXT_COLOR;
        image.fixedToCamera = true;

        // If the user pressed a key, go back to the introduction screen.
        game.input.keyboard.onPressCallback = function(key)
        {
            image.destroy();
            Level.upperBlackRectangle.clear();
            game.input.keyboard.onPressCallback = null;

            GameController.gameState = GameStates.LOAD_INTRODUCTION;
        };
    },

    /**
     * Display the game-over logo.
     */
    displayGameOver : function()
    {
        this.gameOver = game.add.sprite(LevelConstants.GAME_OVER_X, LevelConstants.GAME_OVER_Y, LevelConstants.SPRITE_GAME_OVER);
        this.gameOver.fixedToCamera = true;
    },

    /**
     * Remove the game-over logo.
     */
    removeGameOver : function()
    {
        if (this.gameOver)
        {
            this.gameOver.destroy();
            this.gameOver = null;
        }
    }
};
