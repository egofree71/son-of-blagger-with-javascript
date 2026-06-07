import { GameObjects, Scene } from "phaser";
import { Data } from "../js/data";
import { DEFAULT_HUD_STATE, HUDState, HUDStatePatch } from "../ui/HUDState";
import { HudConstants } from "../ui/hudConstants";
import { RetroHudText } from "../ui/RetroHudText";

export const PROTOTYPE_KEYS_CHANGED_EVENT = "prototype-keys-changed";
export const PROTOTYPE_PLAYER_KILLED_EVENT = "prototype-player-killed";
export const PROTOTYPE_EXIT_CHANGED_EVENT = "prototype-exit-changed";
export const HUD_STATE_CHANGED_EVENT = "hud-state-changed";

const FONT_TEXTURE_KEY = "blagger-font";
const BONUS_MAN_TEXTURE_KEY = "bonus-man";
const AIR_GRADIENT_TEXTURE_KEY = "hud-air-gradient";

interface HUDSceneData extends Partial<HUDState>
{
    debugModeEnabled?: boolean;
}

/**
 * Lower status area for the Phaser 4 prototype.
 *
 * The scene ports the visual structure of the Phaser 2 HUD: black lower panel,
 * retro bitmap labels, score, hi-score, lives, level, air bar and bonus-man
 * sprite. The values are still fed by temporary Phaser 4 state until the real
 * GameController / LevelState flow is ported.
 */
export class HUDScene extends Scene
{
    private state: HUDState = { ...DEFAULT_HUD_STATE };
    private livesText?: RetroHudText;
    private scoreText?: RetroHudText;
    private hiScoreText?: RetroHudText;
    private levelText?: RetroHudText;
    private airMask?: GameObjects.Graphics;
    private bonusManSprite?: GameObjects.Sprite;
    private colorCounter = HudConstants.BONUS_MAN_COLOR_DELAY;
    private colorIndex = HudConstants.BONUS_MAN_MIN_COLOR_INDEX;
    private increaseColorIndex = true;
    private bonusManFrameAccumulatorMs = 0;

    constructor()
    {
        super("HUDScene");
    }

    create(data: HUDSceneData = {}): void
    {
        this.state = {
            ...DEFAULT_HUD_STATE,
            ...data
        };

        this.createBackground();
        this.createAirBar();
        this.createBonusMan();
        this.createStaticLabels();
        this.createValueFields();
        this.refreshAllValues();

        this.game.events.on(HUD_STATE_CHANGED_EVENT, this.applyStatePatch, this);

        // Keep listening only while this overlay scene exists. Game-wide events
        // survive scene restarts, so leaked HUD listeners are otherwise painful.
        this.events.once("shutdown", () => this.removeGameEventListeners());
        this.events.once("destroy", () => this.removeGameEventListeners());

        if (data.debugModeEnabled) {
            this.createDebugHint();
        }
    }

    update(_time: number, deltaMs: number): void
    {
        this.updateBonusManColor(deltaMs);
    }

    private createBackground(): void
    {
        this.add.rectangle(
            0,
            HudConstants.HUD_TOP,
            HudConstants.HUD_WIDTH,
            HudConstants.HUD_HEIGHT,
            HudConstants.COLOR_BLACK
        ).setOrigin(0);
    }

    private createAirBar(): void
    {
        this.ensureAirGradientTexture();

        this.add.image(
            this.toPixelX(HudConstants.AIR_BAR_LEFT_CHAR),
            this.toHudPixelY(HudConstants.AIR_BAR_Y_CHAR),
            AIR_GRADIENT_TEXTURE_KEY
        ).setOrigin(0);

        this.airMask = this.add.graphics();
        this.drawAirMask();
    }

    private ensureAirGradientTexture(): void
    {
        if (this.textures.exists(AIR_GRADIENT_TEXTURE_KEY)) {
            return;
        }

        const width = HudConstants.CHAR_WIDTH * (HudConstants.AIR_BAR_RIGHT_CHAR - HudConstants.AIR_BAR_LEFT_CHAR);
        const height = HudConstants.CHAR_WIDTH;
        const texture = this.textures.createCanvas(AIR_GRADIENT_TEXTURE_KEY, width, height);

        if (!texture) {
            return;
        }

        const context = texture.getContext();
        const gradient = context.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, HudConstants.AIR_GRADIENT_START_COLOR);
        gradient.addColorStop(1, HudConstants.AIR_GRADIENT_END_COLOR);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        texture.refresh();
    }

    private createBonusMan(): void
    {
        this.bonusManSprite = this.add.sprite(
            this.toPixelX(HudConstants.BONUS_MAN_X),
            this.toHudPixelY(HudConstants.BONUS_MAN_Y),
            BONUS_MAN_TEXTURE_KEY
        ).setOrigin(0);

        this.hideBonusMan();
    }

    private createStaticLabels(): void
    {
        this.drawText(HudConstants.LABEL_AIR, HudConstants.AIR_LABEL_X, HudConstants.AIR_LABEL_Y, HudConstants.COLOR_AIR_BLUE);
        this.drawText(HudConstants.LABEL_LIVES, HudConstants.LIVES_LABEL_X, HudConstants.LIVES_LABEL_Y, HudConstants.COLOR_GREY);
        this.drawText(HudConstants.LABEL_SCORE, HudConstants.SCORE_LABEL_X, HudConstants.SCORE_LABEL_Y, HudConstants.COLOR_GREY);
        this.drawText(HudConstants.LABEL_LEVEL, HudConstants.LEVEL_LABEL_X, HudConstants.LEVEL_LABEL_Y, HudConstants.COLOR_GREY);
        this.drawText(HudConstants.LABEL_HI_SCORE, HudConstants.HI_SCORE_LABEL_X, HudConstants.HI_SCORE_LABEL_Y, HudConstants.COLOR_GREY);
    }

    private createValueFields(): void
    {
        this.livesText = this.drawText("", HudConstants.LIVES_VALUE_X, HudConstants.LIVES_VALUE_Y);
        this.scoreText = this.drawText("", HudConstants.SCORE_VALUE_X, HudConstants.SCORE_VALUE_Y);
        this.levelText = this.drawText("", HudConstants.LEVEL_VALUE_X, HudConstants.LEVEL_VALUE_Y);
        this.hiScoreText = this.drawText("", HudConstants.HI_SCORE_VALUE_X, HudConstants.HI_SCORE_VALUE_Y);
    }

    private applyStatePatch(patch: HUDStatePatch): void
    {
        this.state = {
            ...this.state,
            ...patch
        };

        this.refreshAllValues();
    }

    private refreshAllValues(): void
    {
        this.livesText?.setText(this.formatTwoDigits(this.state.lives));
        this.scoreText?.setText(this.formatSixDigits(this.state.score));
        this.hiScoreText?.setText(this.formatSixDigits(this.state.hiScore));
        this.levelText?.setText(this.formatTwoDigits(this.state.levelNumber));
        this.drawAirMask();

        if (!this.state.hasBonusMan) {
            this.hideBonusMan();
        }
    }

    private drawAirMask(): void
    {
        if (!this.airMask) {
            return;
        }

        // Preserve the old Phaser 2 drawing rule: the black mask width is the
        // current air value, so later score-conversion work can reuse it exactly.
        this.airMask.clear();
        this.airMask.fillStyle(HudConstants.COLOR_BLACK, 1);
        this.airMask.fillRect(
            this.toPixelX(HudConstants.AIR_BAR_LEFT_CHAR) + HudConstants.AIR_BAR_INNER_X_OFFSET,
            this.toHudPixelY(HudConstants.AIR_BAR_Y_CHAR) + HudConstants.AIR_BAR_INNER_Y_OFFSET,
            Math.max(0, this.state.airLevel),
            HudConstants.CHAR_WIDTH - HudConstants.AIR_BAR_INNER_HEIGHT_REDUCTION
        );
    }

    private updateBonusManColor(deltaMs: number): void
    {
        if (!this.state.hasBonusMan || !this.bonusManSprite) {
            this.bonusManFrameAccumulatorMs = 0;
            return;
        }

        this.bonusManFrameAccumulatorMs += deltaMs;

        while (this.bonusManFrameAccumulatorMs >= HudConstants.LOGICAL_FRAME_MS) {
            this.bonusManFrameAccumulatorMs -= HudConstants.LOGICAL_FRAME_MS;
            this.advanceBonusManOneFrame();
        }

        this.bonusManSprite.setTint(Data.bonusManColors[this.colorIndex]);
    }

    private advanceBonusManOneFrame(): void
    {
        this.colorCounter -= 1;

        if (this.colorCounter !== 0) {
            return;
        }

        this.colorCounter = HudConstants.BONUS_MAN_COLOR_DELAY;

        if (this.increaseColorIndex) {
            this.colorIndex += 1;
        }
        else {
            this.colorIndex -= 1;
        }

        if (this.colorIndex === HudConstants.BONUS_MAN_MAX_COLOR_INDEX) {
            this.increaseColorIndex = false;
        }

        if (this.colorIndex === HudConstants.BONUS_MAN_MIN_COLOR_INDEX) {
            this.increaseColorIndex = true;
        }
    }

    private hideBonusMan(): void
    {
        this.bonusManFrameAccumulatorMs = 0;
        this.colorCounter = HudConstants.BONUS_MAN_COLOR_DELAY;
        this.colorIndex = HudConstants.BONUS_MAN_MIN_COLOR_INDEX;
        this.increaseColorIndex = true;
        this.bonusManSprite?.setTint(HudConstants.COLOR_BLACK);
    }

    private createDebugHint(): void
    {
        const hint = this.drawText("DBG 8/2/4/6", 28, 11, 0x404040);

        // The debug hint is intentionally dim so it does not look like a real
        // status field from the original game.
        hint.setTint(0x404040);
    }

    private drawText(text: string, x: number, y: number, color: number = HudConstants.COLOR_WHITE): RetroHudText
    {
        const retroText = new RetroHudText(
            this,
            FONT_TEXTURE_KEY,
            this.toPixelX(x),
            this.toHudPixelY(y),
            HudConstants.FONT_CHAR_WIDTH,
            HudConstants.FONT_CHAR_HEIGHT,
            color
        );

        retroText.setText(text);
        return retroText;
    }

    private toPixelX(characterX: number): number
    {
        return HudConstants.CHAR_WIDTH * characterX;
    }

    private toHudPixelY(characterY: number): number
    {
        return HudConstants.HUD_TOP + HudConstants.CHAR_WIDTH * characterY;
    }

    private formatTwoDigits(value: number): string
    {
        return `${HudConstants.TWO_DIGITS_PADDING}${value}`.slice(-2);
    }

    private formatSixDigits(value: number): string
    {
        return `${HudConstants.SIX_DIGITS_PADDING}${value}`.slice(-6);
    }

    private removeGameEventListeners(): void
    {
        this.game.events.off(HUD_STATE_CHANGED_EVENT, this.applyStatePatch, this);
    }
}
