/**
 * Orchestrates the transition played when the player completes a level.
 *
 * The sequence is a frame-by-frame state machine. It delegates focused work to
 * smaller helpers:
 * - LevelTransitionPlayerMover handles target capture and player movement;
 * - LevelTransitionVisualEffects handles background and monster effects;
 * - LevelTransitionAirScore handles air-to-score conversion and air refill.
 *
 * The sequence order and timings are intentionally preserved because this code
 * is part of the original gameplay feel.
 */
var LevelTransition =
{
    // 1) Increase Level.level and read the player spawn position of the next level from the Tiled map.
    PHASE_PREPARE_NEXT_LEVEL : 1,

    // 2) Flash the background red, hide old monsters and play reverse explosions at their positions.
    PHASE_HIDE_MONSTERS : 2,

    // 3) Restore the normal grey background before moving the player.
    PHASE_RESTORE_BACKGROUND : 3,

    // 4) Move the player one pixel at a time until one axis is aligned with the next-level spawn.
    PHASE_FINE_ALIGN_PLAYER : 4,

    // 5) Convert remaining air into score, exactly like the original implementation.
    PHASE_CONVERT_AIR_TO_SCORE : 5,

    // 6) Move the player toward the next-level spawn using 16-pixel tile-sized steps.
    PHASE_MOVE_PLAYER_TO_NEXT_LEVEL : 6,

    // 7) Refill the air bar before the next level starts.
    PHASE_REFILL_AIR : 7,

    // 8) Load the next level objects, update the HUD and give the player a bonus man.
    PHASE_LOAD_NEXT_LEVEL : 8,

    // Delay, in frames, between each 16-pixel movement during the long player movement phase.
    MOVE_DELAY : 4,

    // Current phase of the transition state machine.
    phase : 1,

    // Generic frame counter used by the tile-sized movement phase.
    counter : 4,

    reset : function()
    {
        this.phase = this.PHASE_PREPARE_NEXT_LEVEL;
        this.counter = this.MOVE_DELAY;
        LevelTransitionPlayerMover.reset();
    },

    /**
     * Advances the transition by one frame.
     *
     * GameController calls Level.goToNext() while the game state is
     * GameStates.END_LEVEL. Level.goToNext() delegates to this method.
     */
    update : function()
    {
        switch(this.phase)
        {
            case this.PHASE_PREPARE_NEXT_LEVEL:
                this.prepareNextLevel();
                break;

            case this.PHASE_HIDE_MONSTERS:
                this.hideMonsters();
                break;

            case this.PHASE_RESTORE_BACKGROUND:
                this.restoreBackground();
                break;

            case this.PHASE_FINE_ALIGN_PLAYER:
                this.fineAlignPlayer();
                break;

            case this.PHASE_CONVERT_AIR_TO_SCORE:
                this.convertAirToScore();
                break;

            case this.PHASE_MOVE_PLAYER_TO_NEXT_LEVEL:
                this.movePlayerToNextLevel();
                break;

            case this.PHASE_REFILL_AIR:
                this.refillAir();
                break;

            case this.PHASE_LOAD_NEXT_LEVEL:
                this.loadNextLevel();
                break;
        }
    },

    /**
     * Moves the logical level index to the next level and captures the next
     * player spawn position from the Tiled map.
     */
    prepareNextLevel : function()
    {
        Level.level++;
        LevelTransitionPlayerMover.captureTargetFromTiledMap(Level.level);
        this.phase = this.PHASE_HIDE_MONSTERS;
    },

    /**
     * Ends the completed level visually before the player starts moving.
     */
    hideMonsters : function()
    {
        LevelTransitionVisualEffects.flashBackground();
        LevelTransitionVisualEffects.hideCompletedLevelMonsters();
        LevelTransitionVisualEffects.playReverseExplosions();

        this.phase = this.PHASE_RESTORE_BACKGROUND;
    },

    /**
     * Restores the normal background color.
     *
     * The original code had a counter here, but it also advanced to the next
     * step in the same update. In practice there was no real wait, so this
     * method keeps the effective behaviour: restore the color and continue.
     */
    restoreBackground : function()
    {
        LevelTransitionVisualEffects.restoreBackground();
        this.phase = this.PHASE_FINE_ALIGN_PLAYER;
    },

    /**
     * Performs the precise one-pixel alignment phase before the tile-step move.
     */
    fineAlignPlayer : function()
    {
        if (LevelTransitionPlayerMover.fineAlignOneAxis())
            this.phase = this.PHASE_CONVERT_AIR_TO_SCORE;
    },

    /**
     * Converts remaining air into score, one frame at a time.
     */
    convertAirToScore : function()
    {
        if (LevelTransitionAirScore.convertRemainingAir())
            this.phase = this.PHASE_MOVE_PLAYER_TO_NEXT_LEVEL;

        // Prepare the frame delay used by the following movement phase.
        this.counter = this.MOVE_DELAY;
    },

    /**
     * Moves the player toward the next-level spawn at the preserved transition speed.
     */
    movePlayerToNextLevel : function()
    {
        if (!this.isTileMoveFrame())
            return;

        if (LevelTransitionPlayerMover.moveOneTileStepTowardTarget())
            this.phase = this.PHASE_REFILL_AIR;
    },

    /**
     * Keeps the original delay between tile-sized player movement steps.
     *
     * @returns {boolean} true when this frame should move the player.
     */
    isTileMoveFrame : function()
    {
        this.counter -= 1;

        if (this.counter > 0)
            return false;

        this.counter = this.MOVE_DELAY;
        return true;
    },

    /**
     * Refills the air bar before starting the next level.
     */
    refillAir : function()
    {
        if (LevelTransitionAirScore.refillAir())
            this.phase = this.PHASE_LOAD_NEXT_LEVEL;
    },

    /**
     * Loads the next level and hands control back to the normal start-level flow.
     */
    loadNextLevel : function()
    {
        Level.load();
        HUD.update();

        // On every new level, the user gets a bonus man.
        Level.bonusMan = true;

        this.reset();
        GameController.gameState = GameStates.START_LEVEL;
    }
};
