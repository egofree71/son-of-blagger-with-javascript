import { GameStates } from "./gameStates.ts";
import { HudConstants } from "./hudConstants.ts";
import { Data } from "./data.ts";
import { Level } from "./level.js";
import { GameController } from "./gameController.js";
import { Player } from "./player.ts";

/**
 * Handles the lower status area of the game.
 *
 * The public API is intentionally unchanged: the rest of the game still imports
 * the exported `HUD` singleton and calls methods such as `HUD.init()`,
 * `HUD.updateAirLevel()` or `HUD.displayScore()`.
 *
 * Internally, the previous object literal has been replaced by a class so the
 * HUD state is grouped in one explicit runtime object instead of a large bag of
 * properties separated by commas.
 */
class HUDController
{
    // Width of a character in pixels.
    private readonly charWidth = HudConstants.CHAR_WIDTH;

    // Bitmap-font objects displayed in the HUD.
    private HUDScore: any = null;
    private HUDHiScore: any = null;
    private HUDLives: any = null;
    private HUDLevel: any = null;

    // Graphics object used to mask the remaining air bar.
    private airLevelRectangle: any = null;

    // Counter used to decrease the air level.
    private counter = HudConstants.AIR_DECREASE_DELAY;

    // Bonus-man sprite and color animation state.
    private bonusManSprite: any = null;
    private colorCounter = HudConstants.BONUS_MAN_COLOR_DELAY;
    private colorIndex = HudConstants.BONUS_MAN_MIN_COLOR_INDEX;
    private increaseColorIndex = true;

    /**
     * Creates the HUD graphics and initial text fields.
     *
     * Called once during Phaser create(), after the level and controller state
     * have been initialized.
     */
    init(): void
    {
        // Initialize HUD.
        game.camera.height = 200;

        // Draw the black background.
        var background  = game.add.graphics();
        background.beginFill(HudConstants.COLOR_BLACK, HudConstants.OPAQUE_ALPHA);
        background.drawRect(0, game.camera.height, game.camera.width, game.camera.height);
        background.fixedToCamera = true;

        // Display the background of the air level.
        var myBitmap = game.add.bitmapData(this.charWidth * HudConstants.AIR_BAR_RIGHT_CHAR - this.charWidth * HudConstants.AIR_BAR_LEFT_CHAR, this.charWidth);
        var grd = myBitmap.context.createLinearGradient(0, 0, this.charWidth * HudConstants.AIR_BAR_RIGHT_CHAR, 0);
        grd.addColorStop(0, HudConstants.AIR_GRADIENT_START_COLOR);
        grd.addColorStop(1, HudConstants.AIR_GRADIENT_END_COLOR);
        myBitmap.context.fillStyle = grd;
        myBitmap.context.fillRect(0, 0, this.charWidth * HudConstants.AIR_BAR_RIGHT_CHAR, this.charWidth);

        var sprite = game.add.sprite(this.charWidth * HudConstants.AIR_BAR_LEFT_CHAR, game.camera.height + this.charWidth * HudConstants.AIR_BAR_Y_CHAR, myBitmap);
        sprite.fixedToCamera = true;

        // Draw air level.
        this.airLevelRectangle  = game.add.graphics();
        this.airLevelRectangle.beginFill(HudConstants.COLOR_BLACK, HudConstants.OPAQUE_ALPHA);
        this.airLevelRectangle.drawRect(this.charWidth * HudConstants.AIR_BAR_LEFT_CHAR + HudConstants.AIR_BAR_INNER_X_OFFSET, game.camera.height + this.charWidth * HudConstants.AIR_BAR_Y_CHAR + HudConstants.AIR_BAR_INNER_Y_OFFSET, Level.airLevel, this.charWidth - HudConstants.AIR_BAR_INNER_HEIGHT_REDUCTION);
        this.airLevelRectangle.endFill();
        this.airLevelRectangle.fixedToCamera = true;

        this.drawText(HudConstants.LABEL_AIR, HudConstants.AIR_LABEL_X, HudConstants.AIR_LABEL_Y, HudConstants.COLOR_AIR_BLUE);

        this.bonusManSprite = game.add.sprite(this.charWidth * HudConstants.BONUS_MAN_X, game.camera.height + this.charWidth * HudConstants.BONUS_MAN_Y, HudConstants.BONUS_MAN_SPRITE_KEY);
        this.hideBonusMan();
        this.bonusManSprite.fixedToCamera = true;

        this.drawText(HudConstants.LABEL_LIVES, HudConstants.LIVES_LABEL_X, HudConstants.LIVES_LABEL_Y, HudConstants.COLOR_GREY);
        this.HUDLives = this.drawText((HudConstants.TWO_DIGITS_PADDING + GameController.lives).substr(HudConstants.TWO_DIGITS_LENGTH), HudConstants.LIVES_VALUE_X, HudConstants.LIVES_VALUE_Y);

        this.drawText(HudConstants.LABEL_SCORE, HudConstants.SCORE_LABEL_X, HudConstants.SCORE_LABEL_Y, HudConstants.COLOR_GREY);
        this.HUDScore = this.drawText((HudConstants.SIX_DIGITS_PADDING + GameController.score).substr(HudConstants.SIX_DIGITS_LENGTH), HudConstants.SCORE_VALUE_X, HudConstants.SCORE_VALUE_Y);

        this.drawText(HudConstants.LABEL_LEVEL, HudConstants.LEVEL_LABEL_X, HudConstants.LEVEL_LABEL_Y, HudConstants.COLOR_GREY);
        this.HUDLevel = this.drawText((HudConstants.TWO_DIGITS_PADDING + Level.level).substr(HudConstants.TWO_DIGITS_LENGTH), HudConstants.LEVEL_VALUE_X, HudConstants.LEVEL_VALUE_Y);

        this.drawText(HudConstants.LABEL_HI_SCORE, HudConstants.HI_SCORE_LABEL_X, HudConstants.HI_SCORE_LABEL_Y, HudConstants.COLOR_GREY);
        this.HUDHiScore = this.drawText((HudConstants.SIX_DIGITS_PADDING + GameController.hiScore).substr(HudConstants.SIX_DIGITS_LENGTH), HudConstants.HI_SCORE_VALUE_X, HudConstants.HI_SCORE_VALUE_Y);
    }

    /**
     * If there is a bonus man, display the sprite and animate its color.
     */
    displayBonusMan(): void
    {
        if (Level.bonusMan)
        {
            this.colorCounter -= 1;

            if (this.colorCounter == 0)
            {
                this.colorCounter = HudConstants.BONUS_MAN_COLOR_DELAY;

                if (this.increaseColorIndex)
                    this.colorIndex += 1;
                else
                    this.colorIndex -= 1;

                if (this.colorIndex == HudConstants.BONUS_MAN_MAX_COLOR_INDEX)
                    this.increaseColorIndex = false;

                if (this.colorIndex == HudConstants.BONUS_MAN_MIN_COLOR_INDEX)
                    this.increaseColorIndex = true;
            }

            this.bonusManSprite.tint = Data.bonusManColors[this.colorIndex];
        }
    }

    /**
     * Hide the bonus man sprite.
     */
    hideBonusMan(): void
    {
        this.bonusManSprite.tint = HudConstants.COLOR_BLACK;
    }

    /**
     * Decrease air level and redraw the air bar.
     */
    updateAirLevel(): void
    {
        if (GameController.gameState != GameStates.PLAYING) return;

        this.counter -= 1;

        if (this.counter == 0)
        {
            this.counter = HudConstants.AIR_DECREASE_DELAY;
            Level.decreaseAir(HudConstants.AIR_DECREASE_AMOUNT);
        }

        if (Level.airLevel <= 0)
        {
            Player.kill();
            return;
        }

        this.displayAirLevel();
    }

    clearAirLevel(): void
    {
        this.airLevelRectangle.clear();
    }

    displayAirLevel(): void
    {
        // Display the air bar.
        this.airLevelRectangle.clear();
        this.airLevelRectangle.beginFill(HudConstants.COLOR_BLACK, HudConstants.OPAQUE_ALPHA);
        this.airLevelRectangle.drawRect(this.charWidth * HudConstants.AIR_BAR_LEFT_CHAR + HudConstants.AIR_BAR_INNER_X_OFFSET, game.camera.height + this.charWidth * HudConstants.AIR_BAR_Y_CHAR + HudConstants.AIR_BAR_INNER_Y_OFFSET, Level.airLevel, this.charWidth - HudConstants.AIR_BAR_INNER_HEIGHT_REDUCTION);
        this.airLevelRectangle.endFill();
    }

    /**
     * Update the lives display.
     */
    displayLives(): void
    {
        this.HUDLives.text = (HudConstants.TWO_DIGITS_PADDING + GameController.lives).substr(HudConstants.TWO_DIGITS_LENGTH);
    }

    /**
     * Update the score display.
     */
    displayScore(): void
    {
        this.HUDScore.text = (HudConstants.SIX_DIGITS_PADDING + GameController.score).substr(HudConstants.SIX_DIGITS_LENGTH);
    }

    /**
     * Update all HUD information.
     */
    update(): void
    {
        this.HUDLives.text = (HudConstants.TWO_DIGITS_PADDING + GameController.lives).substr(HudConstants.TWO_DIGITS_LENGTH);
        this.HUDScore.text = (HudConstants.SIX_DIGITS_PADDING + GameController.score).substr(HudConstants.SIX_DIGITS_LENGTH);
        this.HUDHiScore.text = (HudConstants.SIX_DIGITS_PADDING + GameController.hiScore).substr(HudConstants.SIX_DIGITS_LENGTH);
        this.HUDLevel.text = (HudConstants.TWO_DIGITS_PADDING + Level.level).substr(HudConstants.TWO_DIGITS_LENGTH);
    }

    /**
     * Draws text inside the HUD using the retro font.
     */
    private drawText(text: string, x: number, y: number, color?: number): any
    {
        var font = game.add.retroFont(HudConstants.FONT_KEY, HudConstants.FONT_CHAR_WIDTH, HudConstants.FONT_CHAR_HEIGHT, Phaser.RetroFont.TEXT_SET2);
        font.text = text;
        var image = game.add.image(this.charWidth * x ,  game.camera.height + this.charWidth * y, font);

        // If color is not defined, use white.
        // Keep the original truthy/falsy behavior: a value of 0 would still fall
        // back to white, just as it did in the object-literal implementation.
        if (!color)
            image.tint = HudConstants.COLOR_WHITE;
        else
            image.tint = color;

        image.anchor.set(0);
        image.fixedToCamera = true;

        return font;
    }
}

export const HUD = new HUDController();
