import { GameObjects, Scene } from "phaser";
import { isInstalledPwaLaunch } from "../config/RuntimeMode";
import { Data } from "../data/gameData";
import type { PlayerInputControl, PlayerInputControlChangedPayload } from "../input/PlayerInputState";
import { TOUCH_CONTROL_CHANGED_EVENT, TOUCH_HELP_REQUESTED_EVENT } from "../input/PlayerInputState";
import { DEFAULT_HUD_STATE, HUDState, HUDStatePatch } from "../ui/HUDState";
import { HudConstants } from "../ui/hudConstants";
import { RetroHudText } from "../ui/RetroHudText";

export const KEYS_CHANGED_EVENT = "keys-changed";
export const PLAYER_KILLED_EVENT = "player-killed";
export const EXIT_CHANGED_EVENT = "exit-changed";
export const HUD_STATE_CHANGED_EVENT = "hud-state-changed";

const FONT_TEXTURE_KEY = "blagger-font";
const BONUS_MAN_TEXTURE_KEY = "bonus-man";
const AIR_GRADIENT_TEXTURE_KEY = "hud-air-gradient";

interface HUDSceneData extends Partial<HUDState>
{
    debugModeEnabled?: boolean;
    touchModeEnabled?: boolean;
    showTouchControls?: boolean;
    showTouchIntroActions?: boolean;
}

interface PointerLike
{
    id?: number;
    pointerId?: number;
}

interface InputEventLike
{
    stopPropagation?: () => void;
}

interface LockableOrientation
{
    lock?: (orientation: "landscape") => Promise<void>;
    unlock?: () => void;
}

/**
 * Lower status area shown below the gameplay viewport.
 *
 * The HUD owns the black lower panel, retro bitmap labels, score, hi-score,
 * lives, level, air bar and bonus-man sprite. In `?touch=1` mode it switches to
 * the compact mobile layout and can also expose virtual direction/jump buttons.
 */
export class HUDScene extends Scene
{
    private state: HUDState = { ...DEFAULT_HUD_STATE };
    private livesText?: RetroHudText;
    private scoreText?: RetroHudText;
    private hiScoreText?: RetroHudText;
    private levelText?: RetroHudText;
    private fullscreenText?: RetroHudText;
    private airMask?: GameObjects.Graphics;
    private bonusManSprite?: GameObjects.Sprite;
    private touchModeEnabled = false;
    private showTouchControls = false;
    private showTouchIntroActions = false;
    private colorCounter = HudConstants.BONUS_MAN_COLOR_DELAY;
    private colorIndex = HudConstants.BONUS_MAN_MIN_COLOR_INDEX;
    private increaseColorIndex = true;
    private bonusManFrameAccumulatorMs = 0;
    private readonly pressedTouchPointers: Record<PlayerInputControl, Set<number>> = {
        left: new Set<number>(),
        right: new Set<number>(),
        jump: new Set<number>()
    };
    private readonly fullscreenChangeHandler = () => {
        if (!document.fullscreenElement) {
            this.unlockOrientation();
        }

        this.refreshFullscreenText();
        this.scheduleScaleRefresh();
    };
    private readonly viewportChangeHandler = () => this.scheduleScaleRefresh();

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
        this.touchModeEnabled = data.touchModeEnabled === true;
        this.showTouchControls = this.touchModeEnabled && data.showTouchControls === true;
        this.showTouchIntroActions = this.touchModeEnabled && data.showTouchIntroActions === true;

        this.createBackground();
        this.createAirBar();
        this.createBonusMan();
        this.createStaticLabels();
        this.createValueFields();
        this.createTouchUi();
        this.refreshAllValues();

        this.game.events.on(HUD_STATE_CHANGED_EVENT, this.applyStatePatch, this);
        document.addEventListener("fullscreenchange", this.fullscreenChangeHandler);
        window.addEventListener("resize", this.viewportChangeHandler);
        window.addEventListener("orientationchange", this.viewportChangeHandler);

        // Keep listening only while this overlay scene exists. Game-wide events
        // survive scene restarts, so leaked HUD listeners are otherwise painful.
        this.events.once("shutdown", () => this.cleanup());
        this.events.once("destroy", () => this.cleanup());

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
            this.toHudPixelY(this.airBarY),
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
            this.toPixelX(this.bonusManX),
            this.toHudPixelY(this.bonusManY),
            BONUS_MAN_TEXTURE_KEY
        ).setOrigin(0);

        this.hideBonusMan();
    }

    private createStaticLabels(): void
    {
        this.drawText(HudConstants.LABEL_AIR, HudConstants.AIR_LABEL_X, this.airLabelY, HudConstants.COLOR_AIR_BLUE);
        this.drawText(HudConstants.LABEL_LIVES, this.livesLabelX, this.livesLabelY, HudConstants.COLOR_GREY);
        this.drawText(HudConstants.LABEL_SCORE, this.scoreLabelX, this.scoreLabelY, HudConstants.COLOR_GREY);
        this.drawText(HudConstants.LABEL_LEVEL, this.levelLabelX, this.levelLabelY, HudConstants.COLOR_GREY);

        if (!this.touchModeEnabled) {
            this.drawText(HudConstants.LABEL_HI_SCORE, HudConstants.HI_SCORE_LABEL_X, HudConstants.HI_SCORE_LABEL_Y, HudConstants.COLOR_GREY);
        }
    }

    private createValueFields(): void
    {
        this.livesText = this.drawText("", this.livesValueX, this.livesValueY);
        this.scoreText = this.drawText("", this.scoreValueX, this.scoreValueY);
        this.levelText = this.drawText("", this.levelValueX, this.levelValueY);

        if (!this.touchModeEnabled) {
            this.hiScoreText = this.drawText("", HudConstants.HI_SCORE_VALUE_X, HudConstants.HI_SCORE_VALUE_Y);
        }
    }

    private createTouchUi(): void
    {
        if (!this.touchModeEnabled) {
            return;
        }

        if (this.showTouchControls) {
            this.createTouchControlButton("touch-left-button", HudConstants.TOUCH_LEFT_BUTTON_X, "left");
            this.createTouchControlButton("touch-right-button", HudConstants.TOUCH_RIGHT_BUTTON_X, "right");
            this.createTouchControlButton("touch-jump-button", HudConstants.TOUCH_JUMP_BUTTON_X, "jump");
        }

        const installedPwaLaunch = isInstalledPwaLaunch();

        if (!installedPwaLaunch) {
            this.createFullscreenButton();
        }

        if (this.showTouchIntroActions) {
            const helpButtonX = installedPwaLaunch
                ? this.centeredTouchActionButtonX
                : HudConstants.TOUCH_HELP_BUTTON_X;

            this.createTouchActionButton("help", helpButtonX, () => {
                this.game.events.emit(TOUCH_HELP_REQUESTED_EVENT);
            });
        }
    }

    private createTouchControlButton(textureKey: string, characterX: number, control: PlayerInputControl): void
    {
        const button = this.add.image(
            this.toPixelX(characterX),
            this.toHudPixelY(HudConstants.TOUCH_CONTROL_BUTTON_Y) + HudConstants.TOUCH_CONTROL_BUTTON_Y_OFFSET,
            textureKey
        )
            .setOrigin(0)
            .setDepth(20)
            .setAlpha(0.9)
            .setInteractive({ useHandCursor: true });

        button.on("pointerdown", (pointer: PointerLike, _localX: number, _localY: number, event: InputEventLike) => {
            event?.stopPropagation?.();
            this.setTouchControlPressed(control, pointer, true);
        });
        button.on("pointerup", (pointer: PointerLike, _localX: number, _localY: number, event: InputEventLike) => {
            event?.stopPropagation?.();
            this.setTouchControlPressed(control, pointer, false);
        });
        button.on("pointerout", (pointer: PointerLike) => this.setTouchControlPressed(control, pointer, false));
        button.on("pointerupoutside", (pointer: PointerLike) => this.setTouchControlPressed(control, pointer, false));
    }

    private get centeredTouchActionButtonX(): number
    {
        const buttonWidth = HudConstants.CHAR_WIDTH * HudConstants.TOUCH_ACTION_BUTTON_WIDTH_CHARS;
        return (HudConstants.HUD_WIDTH - buttonWidth) / (2 * HudConstants.CHAR_WIDTH);
    }

    private createFullscreenButton(): void
    {
        const buttonX = this.showTouchIntroActions
            ? HudConstants.TOUCH_INTRO_FULLSCREEN_BUTTON_X
            : HudConstants.TOUCH_FULLSCREEN_BUTTON_X;

        this.fullscreenText = this.createTouchActionButton("full", buttonX, () => {
            void this.toggleFullscreen();
        });
        this.refreshFullscreenText();
    }

    private createTouchActionButton(label: string, characterX: number, onPressed: () => void): RetroHudText
    {
        const x = this.toPixelX(characterX);
        const y = this.toHudPixelY(HudConstants.TOUCH_ACTION_BUTTON_Y);
        const width = HudConstants.CHAR_WIDTH * HudConstants.TOUCH_ACTION_BUTTON_WIDTH_CHARS;

        this.add.rectangle(
            x,
            y,
            width,
            HudConstants.TOUCH_ACTION_BUTTON_HEIGHT,
            HudConstants.COLOR_GREY,
            HudConstants.TOUCH_ACTION_BUTTON_ALPHA
        )
            .setOrigin(0)
            .setDepth(21)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (_pointer: PointerLike, _localX: number, _localY: number, event: InputEventLike) => {
                event?.stopPropagation?.();
            })
            .on("pointerup", (_pointer: PointerLike, _localX: number, _localY: number, event: InputEventLike) => {
                event?.stopPropagation?.();

                // Mobile browsers are much more reliable when fullscreen is
                // requested from pointerup rather than pointerdown.
                onPressed();
            });

        const textX = characterX + ((HudConstants.TOUCH_ACTION_BUTTON_WIDTH_CHARS - label.length) / 2);
        const textY = HudConstants.TOUCH_ACTION_BUTTON_Y + HudConstants.TOUCH_ACTION_BUTTON_TEXT_Y_OFFSET;
        const text = this.drawText(label, textX, textY, HudConstants.COLOR_WHITE);
        text.setDepth(22);
        return text;
    }

    private async toggleFullscreen(): Promise<void>
    {
        if (isInstalledPwaLaunch()) {
            return;
        }

        try {
            if (document.fullscreenElement) {
                this.unlockOrientation();
                await document.exitFullscreen();
                await this.waitForViewportToSettle();
                return;
            }

            await this.fullscreenTarget.requestFullscreen();
            await this.waitForViewportToSettle();
            await this.lockLandscapeOrientation();
            await this.waitForViewportToSettle();
        }
        catch (error) {
            console.warn("Fullscreen/orientation request failed.", error);
        }
        finally {
            this.refreshFullscreenText();
            this.scheduleScaleRefresh();
        }
    }

    private async lockLandscapeOrientation(): Promise<void>
    {
        const orientation = this.screenOrientation;

        // Browsers are free to reject orientation locking. Keeping the failure
        // non-blocking lets the fullscreen button remain useful on iOS/Safari.
        if (!this.touchModeEnabled || typeof orientation?.lock !== "function") {
            return;
        }

        try {
            await orientation.lock("landscape");
        }
        catch (error) {
            console.warn("Landscape orientation lock failed.", error);
        }
    }

    private unlockOrientation(): void
    {
        const orientation = this.screenOrientation;

        if (!this.touchModeEnabled || typeof orientation?.unlock !== "function") {
            return;
        }

        orientation.unlock();
    }

    private get screenOrientation(): LockableOrientation | undefined
    {
        return (screen as Screen & { orientation?: LockableOrientation }).orientation;
    }

    private get fullscreenTarget(): HTMLElement
    {
        return this.game.canvas.parentElement ?? document.documentElement;
    }

    private async waitForViewportToSettle(): Promise<void>
    {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await new Promise<void>((resolve) => window.setTimeout(resolve, 150));
    }

    private scheduleScaleRefresh(): void
    {
        // Mobile Chrome can resize the fullscreen viewport in several small
        // steps while switching orientation. Refreshing Phaser a few times avoids
        // keeping a stale portrait-sized canvas centered in a landscape screen.
        for (const delayMs of [0, 100, 300, 600]) {
            window.setTimeout(() => this.scale.refresh(), delayMs);
        }
    }

    private refreshFullscreenText(): void
    {
        this.fullscreenText?.setText(document.fullscreenElement ? "exit" : "full");
    }

    private setTouchControlPressed(control: PlayerInputControl, pointer: PointerLike, pressed: boolean): void
    {
        const pointerId = this.pointerId(pointer);
        const pressedPointers = this.pressedTouchPointers[control];
        const wasActive = pressedPointers.size > 0;

        if (pressed) {
            pressedPointers.add(pointerId);
        }
        else {
            pressedPointers.delete(pointerId);
        }

        const isActive = pressedPointers.size > 0;

        if (isActive === wasActive) {
            return;
        }

        const payload: PlayerInputControlChangedPayload = {
            control,
            active: isActive
        };
        this.game.events.emit(TOUCH_CONTROL_CHANGED_EVENT, payload);
    }

    private pointerId(pointer: PointerLike): number
    {
        return pointer.id ?? pointer.pointerId ?? 0;
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

        // The air value is drawn as a black mask over the colored gradient: lower
        // air means a wider visible black overlay.
        this.airMask.clear();
        this.airMask.fillStyle(HudConstants.COLOR_BLACK, 1);
        this.airMask.fillRect(
            this.toPixelX(HudConstants.AIR_BAR_LEFT_CHAR) + HudConstants.AIR_BAR_INNER_X_OFFSET,
            this.toHudPixelY(this.airBarY) + HudConstants.AIR_BAR_INNER_Y_OFFSET,
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

    private cleanup(): void
    {
        this.removeGameEventListeners();
        this.releaseAllTouchControls();
        document.removeEventListener("fullscreenchange", this.fullscreenChangeHandler);
        window.removeEventListener("resize", this.viewportChangeHandler);
        window.removeEventListener("orientationchange", this.viewportChangeHandler);
    }

    private removeGameEventListeners(): void
    {
        this.game.events.off(HUD_STATE_CHANGED_EVENT, this.applyStatePatch, this);
    }

    private releaseAllTouchControls(): void
    {
        const controls: PlayerInputControl[] = ["left", "right", "jump"];

        for (const control of controls) {
            const pressedPointers = this.pressedTouchPointers[control];

            if (pressedPointers.size === 0) {
                continue;
            }

            pressedPointers.clear();
            this.game.events.emit(TOUCH_CONTROL_CHANGED_EVENT, {
                control,
                active: false
            } satisfies PlayerInputControlChangedPayload);
        }
    }

    private get airBarY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_AIR_BAR_Y_CHAR : HudConstants.AIR_BAR_Y_CHAR;
    }

    private get airLabelY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_AIR_LABEL_Y : HudConstants.AIR_LABEL_Y;
    }

    private get bonusManX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_BONUS_MAN_X : HudConstants.BONUS_MAN_X;
    }

    private get bonusManY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_BONUS_MAN_Y : HudConstants.BONUS_MAN_Y;
    }

    private get livesLabelX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LIVES_LABEL_X : HudConstants.LIVES_LABEL_X;
    }

    private get livesLabelY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LIVES_LABEL_Y : HudConstants.LIVES_LABEL_Y;
    }

    private get livesValueX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LIVES_VALUE_X : HudConstants.LIVES_VALUE_X;
    }

    private get livesValueY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LIVES_VALUE_Y : HudConstants.LIVES_VALUE_Y;
    }

    private get scoreLabelX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_SCORE_LABEL_X : HudConstants.SCORE_LABEL_X;
    }

    private get scoreLabelY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_SCORE_LABEL_Y : HudConstants.SCORE_LABEL_Y;
    }

    private get scoreValueX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_SCORE_VALUE_X : HudConstants.SCORE_VALUE_X;
    }

    private get scoreValueY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_SCORE_VALUE_Y : HudConstants.SCORE_VALUE_Y;
    }

    private get levelLabelX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LEVEL_LABEL_X : HudConstants.LEVEL_LABEL_X;
    }

    private get levelLabelY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LEVEL_LABEL_Y : HudConstants.LEVEL_LABEL_Y;
    }

    private get levelValueX(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LEVEL_VALUE_X : HudConstants.LEVEL_VALUE_X;
    }

    private get levelValueY(): number
    {
        return this.touchModeEnabled ? HudConstants.TOUCH_LEVEL_VALUE_Y : HudConstants.LEVEL_VALUE_Y;
    }
}
