import { PlayerStates } from "./playerStates.ts";
import type { PlayerController } from "./player.ts";

/**
 * Handles only the visual death animation for the player.
 *
 * The global consequences of death are owned by GameController: stopping
 * gameplay, consuming the bonus man, losing a life, refreshing the HUD and
 * deciding whether to reload the level or show game over. This keeps the death
 * animation sequence focused on visuals instead of making it depend on the
 * whole runtime.
 */
class PlayerDeathSequenceController
{
    /**
     * Starts the death animation for the given player object.
     *
     * The callback is invoked when the animation completes. The callback keeps
     * the flow owner explicit and avoids direct dependencies on GameController,
     * Level or HUD from this visual sequence.
     */
    start(player: PlayerController, onComplete: () => void): void
    {
        player.hideSprite();

        player.setDyingSprite(this.createDeathSprite(player));
        const animation = player.addDyingAnimation();

        animation.onComplete.add((): void =>
        {
            onComplete();
        });

        player.playDyingAnimation();
    }

    /**
     * Creates the separate sprite used during the death animation.
     *
     * A deadly fall uses the white dying sprite, preserving the original visual
     * feedback from the previous implementation.
     */
    private createDeathSprite(player: PlayerController): any
    {
        const deathSprite = game.add.sprite(
            player.getBodyX(),
            player.getBodyY() - PlayerStates.DYING_SPRITE_Y_OFFSET,
            PlayerStates.SPRITE_BLAGGER_DYING);

        if (player.isDeadlyFall())
            deathSprite.loadTexture(PlayerStates.SPRITE_BLAGGER_DYING_WHITE);

        return deathSprite;
    }
}

export const PlayerDeathSequence = new PlayerDeathSequenceController();
