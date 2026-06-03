import { GameStates } from "./gameStates.ts";
import { PlayerStates } from "./playerStates.ts";
import { HUD } from "./HUD.ts";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";

interface DeathSequencePlayer
{
    playerSprite: any;
    playerDyingSprite: any;
    deadlyFall: boolean;
}

/**
 * Handles the visual and gameplay consequences of the player's death.
 *
 * Player remains responsible for movement and for deciding when death should be
 * triggered. Once death starts, this controller owns the animation callback and
 * the life / bonus-man / reload decision that happens after the animation
 * finishes.
 *
 * The public singleton name is intentionally unchanged: the rest of the game
 * still calls `PlayerDeathSequence.start(Player)`.
 */
class PlayerDeathSequenceController
{
    /**
     * Starts the death animation for the given player object.
     *
     * The behavior intentionally matches the previous Player.kill() logic:
     * normal gameplay stops immediately, the normal sprite is hidden, a separate
     * death sprite is displayed, then the level is reloaded or the game-over
     * screen is shown when the animation completes.
     */
    start(player: DeathSequencePlayer): void
    {
        GameController.setState(GameStates.KILL_PLAYER);
        player.playerSprite.visible = false;

        player.playerDyingSprite = this.createDeathSprite(player);
        const animation = player.playerDyingSprite.animations.add(PlayerStates.ANIMATION_BLAGGER_DYING);

        animation.onComplete.add((): void =>
        {
            this.finish();
        });

        player.playerDyingSprite.animations.play(
            PlayerStates.ANIMATION_BLAGGER_DYING,
            PlayerStates.DYING_ANIMATION_FRAME_RATE,
            false,
            true);
    }

    /**
     * Creates the separate sprite used during the death animation.
     *
     * A deadly fall uses the white dying sprite, preserving the original visual
     * feedback from the previous implementation.
     */
    private createDeathSprite(player: DeathSequencePlayer): any
    {
        const deathSprite = game.add.sprite(
            player.playerSprite.body.x,
            player.playerSprite.body.y - PlayerStates.DYING_SPRITE_Y_OFFSET,
            PlayerStates.SPRITE_BLAGGER_DYING);

        if (player.deadlyFall)
            deathSprite.loadTexture(PlayerStates.SPRITE_BLAGGER_DYING_WHITE);

        return deathSprite;
    }

    /**
     * Applies the consequences of the completed death animation.
     */
    private finish(): void
    {
        this.consumeBonusManOrLife();

        HUD.displayLives();
        Level.resetAirLevel();
        HUD.displayAirLevel();

        if (GameController.hasNoLives())
            GameController.setState(GameStates.SHOW_GAME_OVER);
        else
            GameController.setState(GameStates.LOAD_LEVEL);
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
            GameController.loseLife();
        }
    }
}

export const PlayerDeathSequence = new PlayerDeathSequenceController();
