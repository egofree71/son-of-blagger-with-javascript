import { Scene } from "phaser";

/**
 * Game-over overlay displayed after the last life is lost.
 *
 * Phaser 2 showed only the transparent "game over" logo over the current play
 * area and waited for a key press before returning to the introduction. This
 * scene is launched on top of GameScene/HUDScene so the lower HUD can remain
 * visible until the player leaves the screen.
 */
export class GameOverScene extends Scene
{
    constructor()
    {
        super("GameOverScene");
    }

    create(): void
    {
        this.add.image(140, 50, "game-over").setOrigin(0).setDepth(1000);

        this.input.keyboard?.once("keydown", () => {
            this.scene.stop("HUDScene");
            this.scene.stop("GameScene");
            this.scene.start("TitleScene");
        });
    }
}
