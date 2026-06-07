import { Scene } from "phaser";

/**
 * Game-over overlay displayed after the last life is lost.
 *
 * The scene is launched on top of GameScene and HUDScene. It only draws the
 * transparent game-over logo and waits for a key press before returning to the
 * title screen.
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
