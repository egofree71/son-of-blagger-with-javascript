import { GameObjects, Scene } from "phaser";

const RETRO_FONT_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const UNKNOWN_CHARACTER_INDEX = RETRO_FONT_CHARS.indexOf("?");

/**
 * Small Phaser 4 renderer for the bitmap font used by the original HUD.
 *
 * Phaser 2 exposed `RetroFont`, but Phaser 4 does not provide the same helper.
 * This class keeps the old 16x16 character grid by slicing `fonts.png` into
 * texture frames and composing labels from individual image game objects.
 */
export class RetroHudText
{
    private readonly container: GameObjects.Container;
    private readonly letters: GameObjects.Image[] = [];
    private currentText = "";

    constructor(
        private readonly scene: Scene,
        private readonly textureKey: string,
        x: number,
        y: number,
        private readonly charWidth: number,
        private readonly charHeight: number,
        private tint: number
    )
    {
        ensureRetroFontFrames(scene, textureKey, charWidth, charHeight);
        this.container = scene.add.container(x, y);
    }

    /**
     * Replaces the displayed text while preserving the same HUD position.
     */
    setText(text: string): void
    {
        const normalizedText = text.toUpperCase();

        if (normalizedText === this.currentText) {
            return;
        }

        this.currentText = normalizedText;
        this.letters.forEach((letter) => letter.destroy());
        this.letters.length = 0;

        for (let index = 0; index < normalizedText.length; index += 1) {
            const frameName = frameNameForCharacter(normalizedText[index]);
            const letter = this.scene.add.image(index * this.charWidth, 0, this.textureKey, frameName)
                .setOrigin(0)
                .setTint(this.tint);

            this.container.add(letter);
            this.letters.push(letter);
        }
    }

    /**
     * Changes the color of every already-created letter.
     */
    setTint(tint: number): void
    {
        this.tint = tint;
        this.letters.forEach((letter) => letter.setTint(tint));
    }

    /**
     * Removes the composed bitmap text from the scene.
     */
    destroy(): void
    {
        this.container.destroy(true);
        this.letters.length = 0;
    }
}

/**
 * Adds named frames for each character of the old Phaser 2 RetroFont set.
 */
function ensureRetroFontFrames(scene: Scene, textureKey: string, charWidth: number, charHeight: number): void
{
    const texture = scene.textures.get(textureKey);

    for (let index = 0; index < RETRO_FONT_CHARS.length; index += 1) {
        const frameName = frameNameForIndex(index);

        if (texture.has(frameName)) {
            continue;
        }

        texture.add(frameName, 0, index * charWidth, 0, charWidth, charHeight);
    }
}

function frameNameForCharacter(character: string): string
{
    const characterIndex = RETRO_FONT_CHARS.indexOf(character);
    return frameNameForIndex(characterIndex >= 0 ? characterIndex : UNKNOWN_CHARACTER_INDEX);
}

function frameNameForIndex(index: number): string
{
    return `hud-font-${index}`;
}
