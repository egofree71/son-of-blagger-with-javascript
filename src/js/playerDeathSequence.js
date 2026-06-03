import { GameStates } from "./gameStates.ts";
import { PlayerStates } from "./playerStates.ts";
import { HUD } from "./HUD.js";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";

/**
 * Handles the visual and gameplay consequences of the player's death.
 *
 * Player remains responsible for movement and for deciding when death should be
 * triggered. Once death starts, this object owns the animation callback and the
 * life / bonus-man / reload decision that happens after the animation finishes.
 */
export const PlayerDeathSequence =
{
    /**
     * Starts the death animation for the given player object.
     *
     * The behavior intentionally matches the previous Player.kill() logic:
     * normal gameplay stops immediately, the normal sprite is hidden, a separate
     * death sprite is displayed, then the level is reloaded or the game-over
     * screen is shown when the animation completes.
     */
    start : function(player)
    {
        GameController.gameState = GameStates.KILL_PLAYER;
        player.playerSprite.visible = false;

        player.playerDyingSprite = this.createDeathSprite(player);
        var animation = player.playerDyingSprite.animations.add(PlayerStates.ANIMATION_BLAGGER_DYING);

        animation.onComplete.add(function()
        {
            PlayerDeathSequence.finish();
        });

        player.playerDyingSprite.animations.play(
            PlayerStates.ANIMATION_BLAGGER_DYING,
            PlayerStates.DYING_ANIMATION_FRAME_RATE,
            false,
            true);
    },

    /**
     * Creates the separate sprite used during the death animation.
     *
     * A deadly fall uses the white dying sprite, preserving the original visual
     * feedback from the previous implementation.
     */
    createDeathSprite : function(player)
    {
        var deathSprite = game.add.sprite(
            player.playerSprite.body.x,
            player.playerSprite.body.y - PlayerStates.DYING_SPRITE_Y_OFFSET,
            PlayerStates.SPRITE_BLAGGER_DYING);

        if (player.deadlyFall)
            deathSprite.loadTexture(PlayerStates.SPRITE_BLAGGER_DYING_WHITE);

        return deathSprite;
    },

    /**
     * Applies the consequences of the completed death animation.
     */
    finish : function()
    {
        this.consumeBonusManOrLife();

        HUD.displayLives();
        Level.resetAirLevel();
        HUD.displayAirLevel();

        if (GameController.lives == 0)
            GameController.gameState = GameStates.SHOW_GAME_OVER;
        else
            GameController.gameState = GameStates.LOAD_LEVEL;
    },

    /**
     * The bonus man prevents losing one life once, then disappears.
     */
    consumeBonusManOrLife : function()
    {
        if (Level.bonusMan == true)
        {
            HUD.hideBonusMan();
            Level.bonusMan = false;
        }
        else
        {
            GameController.lives -= 1;
        }
    }
};
