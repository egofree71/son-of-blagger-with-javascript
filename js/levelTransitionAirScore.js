/**
 * Score and air-bar rules used by the end-level transition.
 *
 * The transition converts remaining air into score, then refills the air bar
 * before the next level starts. The numeric values are kept in LevelConstants
 * so the timing and scoring remain identical to the existing gameplay.
 */
var LevelTransitionAirScore =
{
    /**
     * Converts one frame worth of remaining air into score.
     *
     * @returns {boolean} true when all remaining air has been converted.
     */
    convertRemainingAir : function()
    {
        if (Level.airLevel > 0)
        {
            Level.airLevel -= LevelConstants.END_LEVEL_TRANSITION_AIR_DECREMENT;
            GameController.score += LevelConstants.END_LEVEL_TRANSITION_SCORE_INCREMENT;
            HUD.displayScore();
            HUD.displayAirLevel();
            return false;
        }

        HUD.clearAirLevel();
        return true;
    },

    /**
     * Refills one frame worth of air before the next level starts.
     *
     * @returns {boolean} true when the air bar is full.
     */
    refillAir : function()
    {
        if (Level.airLevel < LevelConstants.DEFAULT_AIR_LEVEL)
        {
            Level.airLevel += LevelConstants.END_LEVEL_TRANSITION_AIR_DECREMENT;
            HUD.displayAirLevel();
            return false;
        }

        return true;
    }
};
