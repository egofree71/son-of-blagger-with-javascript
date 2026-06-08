import { Scene } from "phaser";
import { isTouchModeEnabled } from "../config/RuntimeMode";

/**
 * Game-over overlay displayed after the last life is lost.
 *
 * The scene is launched on top of GameScene and HUDScene. It only draws the
 * transparent game-over logo and waits for a key press or touch before returning
 * to the title screen.
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

        const returnToTitle = () => {
            this.scene.stop("HUDScene");
            this.scene.stop("GameScene");
            this.scene.start("TitleScene");
        };

        this.input.keyboard?.once("keydown", returnToTitle);

        if (isTouchModeEnabled()) {
            this.input.once("pointerdown", returnToTitle);
        }
    }
}
