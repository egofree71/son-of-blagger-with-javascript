import { GameStates } from "./gameStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { Util } from "./util.ts";
import { Player } from "./player.ts";
import { HUD } from "./HUD.js";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";

const PHASE_PREPARE_NEXT_LEVEL = 1;
const PHASE_HIDE_MONSTERS = 2;
const PHASE_RESTORE_BACKGROUND = 3;
const PHASE_FINE_ALIGN_PLAYER = 4;
const PHASE_CONVERT_AIR_TO_SCORE = 5;
const PHASE_MOVE_PLAYER_TO_NEXT_LEVEL = 6;
const PHASE_REFILL_AIR = 7;
const PHASE_LOAD_NEXT_LEVEL = 8;

type LevelTransitionPhase =
    | typeof PHASE_PREPARE_NEXT_LEVEL
    | typeof PHASE_HIDE_MONSTERS
    | typeof PHASE_RESTORE_BACKGROUND
    | typeof PHASE_FINE_ALIGN_PLAYER
    | typeof PHASE_CONVERT_AIR_TO_SCORE
    | typeof PHASE_MOVE_PLAYER_TO_NEXT_LEVEL
    | typeof PHASE_REFILL_AIR
    | typeof PHASE_LOAD_NEXT_LEVEL;

/**
 * Handles the transition played when the player completes a level.
 *
 * This object is intentionally kept in the same "old-school" style as the rest
 * of the project: one global object literal, updated once per frame by
 * GameController through Level.goToNext().
 *
 * The goal of this first refactoring step is deliberately modest:
 * - move the end-level sequence out of Level.js;
 * - keep the exact same gameplay behaviour and timings;
 * - make the sequence easier to read before any Phaser or TypeScript migration.
 *
 * The transition is a small state machine. The original code used numeric
 * values in Level.stepEndLevel. Here the numeric values are still preserved,
 * but they are named so each phase explains what it does.
 */
export const LevelTransition =
{
    // 1) Increase Level.level and read the player spawn position of the next level from the Tiled map.
    PHASE_PREPARE_NEXT_LEVEL : PHASE_PREPARE_NEXT_LEVEL,

    // 2) Flash the background red, hide old monsters and play reverse explosions at their positions.
    PHASE_HIDE_MONSTERS : PHASE_HIDE_MONSTERS,

    // 3) Restore the normal grey background before moving the player.
    PHASE_RESTORE_BACKGROUND : PHASE_RESTORE_BACKGROUND,

    // 4) Move the player one pixel at a time until one axis is aligned with the next-level spawn.
    PHASE_FINE_ALIGN_PLAYER : PHASE_FINE_ALIGN_PLAYER,

    // 5) Convert remaining air into score, exactly like the original implementation.
    PHASE_CONVERT_AIR_TO_SCORE : PHASE_CONVERT_AIR_TO_SCORE,

    // 6) Move the player toward the next-level spawn using 16-pixel tile-sized steps.
    PHASE_MOVE_PLAYER_TO_NEXT_LEVEL : PHASE_MOVE_PLAYER_TO_NEXT_LEVEL,

    // 7) Refill the air bar before the next level starts.
    PHASE_REFILL_AIR : PHASE_REFILL_AIR,

    // 8) Load the next level objects, update the HUD and give the player a bonus man.
    PHASE_LOAD_NEXT_LEVEL : PHASE_LOAD_NEXT_LEVEL,

    // Delay, in frames, between each 16-pixel movement during the long player movement phase.
    // This keeps the transition speed identical to the previous counterEndLevel = 4 behaviour.
    MOVE_DELAY : 4,

    // Current phase of the transition state machine.
    phase : PHASE_PREPARE_NEXT_LEVEL as LevelTransitionPhase,

    // Generic frame counter used by the tile-sized movement phase.
    counter : 4,

    // Target player position in the next level.
    // These coordinates are calculated once at the beginning of the transition.
    nextPlayerPositionX : 0,
    nextPlayerPositionY : 0,

    /**
     * Resets the transition to its initial state.
     *
     * This is called after the next level has been loaded, so the object is ready
     * for the next time the player reaches a safe.
     */
    reset : function(): void
    {
        this.phase = this.PHASE_PREPARE_NEXT_LEVEL;
        this.counter = this.MOVE_DELAY;
        this.nextPlayerPositionX = 0;
        this.nextPlayerPositionY = 0;
    },

    /**
     * Advances the transition by one frame.
     *
     * GameController calls Level.goToNext() while the game state is GameStates.END_LEVEL.
     * Level.goToNext() delegates to this method.
     */
    update : function(): void
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
     * Moves the logical level index to the next level and retrieves the matching
     * player spawn object from the Tiled map.
     *
     * The player Y offset is preserved from the original code. It compensates for
     * the difference between the Tiled object position and the Phaser body/sprite
     * position used by the player.
     */
    prepareNextLevel : function(): void
    {
        Level.level++;

        var results = Util.findObjectsByProperty(map, LevelConstants.TILED_PROPERTY_LEVEL, Level.level, LevelConstants.OBJECT_LAYER_PLAYER);
        this.nextPlayerPositionX = results[0].x;
        this.nextPlayerPositionY = results[0].y - LevelConstants.PLAYER_TILED_Y_OFFSET;

        this.phase = this.PHASE_HIDE_MONSTERS;
    },

    /**
     * Ends the current level visually:
     * - turn the background red;
     * - hide all monsters from the completed level;
     * - play a reverse explosion where each monster was.
     *
     * This keeps the little visual flourish from the original transition, but
     * isolates it from Level.js.
     */
    hideMonsters : function(): void
    {
        game.stage.backgroundColor = LevelConstants.STAGE_COLOR_TRANSITION;

        // Hide monsters from the completed level.
        for (var i = 0; i < Level.monsters.length; i++)
            Level.monsters[i].sprite.visible = false;

        // Remove any previous reverse explosion sprites before creating new ones.
        Level.reverseExplosions.removeAll(true);

        // Display one reverse explosion at the last position of each monster.
        for (var j = 0; j < Level.monsters.length; j++)
        {
            var reverseExplosion = Level.reverseExplosions.create(Level.monsters[j].sprite.body.x, Level.monsters[j].sprite.body.y, LevelConstants.SPRITE_REVERSE_EXPLOSION);
            reverseExplosion.animations.add(LevelConstants.SPRITE_REVERSE_EXPLOSION);
            reverseExplosion.animations.play(LevelConstants.SPRITE_REVERSE_EXPLOSION, LevelConstants.EXPLOSION_FRAME_RATE, false, true);
        }

        this.phase = this.PHASE_RESTORE_BACKGROUND;
    },

    /**
     * Restores the normal background color.
     *
     * The old code had a counter here, but it also advanced to the next step in
     * the same update. In practice there was no real wait, so this method keeps
     * the effective behaviour: restore the color and continue immediately.
     */
    restoreBackground : function(): void
    {
        game.stage.backgroundColor = LevelConstants.STAGE_COLOR_NORMAL;
        this.phase = this.PHASE_FINE_ALIGN_PLAYER;
    },

    /**
     * Performs a precise one-pixel alignment before the larger tile-based move.
     *
     * The transition first moves the player on the axis where the distance is
     * smaller. Once either the X axis or the Y axis is aligned, the sequence can
     * continue to the score conversion phase.
     *
     * This slightly unusual "stop when one axis is aligned" rule is intentional:
     * it preserves the original behaviour of the game.
     */
    fineAlignPlayer : function(): void
    {
        var horizontalDistance = Player.playerSprite.body.x - this.nextPlayerPositionX;
        var verticalDistance = Player.playerSprite.body.y - this.nextPlayerPositionY;

        // Preserve the original behaviour: leave this phase as soon as one axis is aligned.
        if (verticalDistance == 0 || horizontalDistance == 0)
        {
            this.phase = this.PHASE_CONVERT_AIR_TO_SCORE;
            return;
        }

        // Move along the axis which has the smaller remaining distance.
        if (Math.abs(verticalDistance) < Math.abs(horizontalDistance))
        {
            if (verticalDistance > 0)
                Player.playerSprite.body.y -= 1;
            else
                Player.playerSprite.body.y += 1;
        }
        else
        {
            if (horizontalDistance > 0)
                Player.playerSprite.body.x -= 1;
            else
                Player.playerSprite.body.x += 1;
        }
    },

    /**
     * Converts the remaining air into score.
     *
     * Every frame, the air bar is reduced and the score is increased using the preserved transition constants.
     * Once air reaches zero, the air display is cleared and the player starts
     * moving toward the next-level spawn.
     */
    convertAirToScore : function(): void
    {
        if (Level.airLevel > 0)
        {
            Level.airLevel -= LevelConstants.END_LEVEL_TRANSITION_AIR_DECREMENT;
            GameController.score += LevelConstants.END_LEVEL_TRANSITION_SCORE_INCREMENT;
            HUD.displayScore();
            HUD.displayAirLevel();
        }
        else
        {
            HUD.clearAirLevel();
            this.phase = this.PHASE_MOVE_PLAYER_TO_NEXT_LEVEL;
        }

        // Prepare the frame delay used by the following movement phase.
        this.counter = this.MOVE_DELAY;
    },

    /**
     * Moves the player toward the next-level spawn.
     *
     * This is the visible "travel" part of the transition. The player is moved
     * every MOVE_DELAY frames, by one tile-sized step at a time, which corresponds to the
     * tile size used by the map.
     *
     * If the remaining distance is smaller than one tile-sized step, the player is snapped
     * exactly to the target position to avoid overshooting.
     */
    movePlayerToNextLevel : function(): void
    {
        this.counter -= 1;

        if (this.counter > 0)
            return;

        this.counter = this.MOVE_DELAY;

        var horizontalDistance = Player.playerSprite.body.x - this.nextPlayerPositionX;
        var verticalDistance = Player.playerSprite.body.y - this.nextPlayerPositionY;

        if (verticalDistance == 0 && horizontalDistance == 0)
        {
            this.phase = this.PHASE_REFILL_AIR;
            return;
        }

        if (verticalDistance == 0)
        {
            if (Math.abs(horizontalDistance) < LevelConstants.END_LEVEL_TRANSITION_TILE_STEP)
            {
                Player.playerSprite.body.x = this.nextPlayerPositionX;
                this.phase = this.PHASE_REFILL_AIR;
                return;
            }

            if (horizontalDistance > 0)
                Player.playerSprite.body.x -= LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;
            else
                Player.playerSprite.body.x += LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;
        }
        else
        {
            if (Math.abs(verticalDistance) < LevelConstants.END_LEVEL_TRANSITION_TILE_STEP)
            {
                Player.playerSprite.body.y = this.nextPlayerPositionY;
                this.phase = this.PHASE_REFILL_AIR;
                return;
            }

            if (verticalDistance > 0)
                Player.playerSprite.body.y -= LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;
            else
                Player.playerSprite.body.y += LevelConstants.END_LEVEL_TRANSITION_TILE_STEP;
        }
    },

    /**
     * Refills the air bar before starting the next level.
     *
     * The air bar goes back to the default air level, using the same increment as before.
     */
    refillAir : function(): void
    {
        if (Level.airLevel < LevelConstants.DEFAULT_AIR_LEVEL)
        {
            Level.airLevel += LevelConstants.END_LEVEL_TRANSITION_AIR_DECREMENT;
            HUD.displayAirLevel();
        }
        else
        {
            this.phase = this.PHASE_LOAD_NEXT_LEVEL;
        }
    },

    /**
     * Loads the next level and hands control back to the normal start-level flow.
     *
     * Level.load() resets level-related data, creates monsters for the new level
     * and positions the player. HUD.update() refreshes score, lives, level and air.
     *
     * After every completed level, Level.bonusMan is set to true so the HUD shows
     * the bonus man reward animation on the next level.
     */
    loadNextLevel : function(): void
    {
        Level.load();
        HUD.update();

        // On every new level, the user gets a bonus man.
        Level.bonusMan = true;

        this.reset();
        GameController.gameState = GameStates.START_LEVEL;
    }

};
