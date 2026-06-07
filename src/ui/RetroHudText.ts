import { GameObjects, Scene, Textures } from "phaser";

const RETRO_FONT_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const UNKNOWN_CHARACTER_INDEX = RETRO_FONT_CHARS.indexOf("?");

/**
 * Renderer for the bitmap font used by the HUD and text screens.
 *
 * The class slices `fonts.png` into 16x16 character frames, then composes labels
 * from individual image objects. It supports multi-line text, tinting and the
 * large scaled message used by the ending screen.
 */
export class RetroHudText
{
    private readonly container: GameObjects.Container;
    private readonly letters: GameObjects.Image[] = [];
    private currentText = "";

    /**
     * @param scene Scene that owns the composed text container.
     * @param textureKey Bitmap font texture key.
     * @param x Left position of the text block in logical pixels.
     * @param y Top position of the text block in logical pixels.
     * @param charWidth Width of one character cell in the font texture.
     * @param charHeight Height of one character cell in the font texture.
     * @param tint Initial color applied to every character.
     * @param characterSpacing Extra pixels inserted between characters.
     * @param lineSpacing Extra pixels inserted between text lines.
     */
    constructor(
        private readonly scene: Scene,
        private readonly textureKey: string,
        x: number,
        y: number,
        private readonly charWidth: number,
        private readonly charHeight: number,
        private tint: number,
        private readonly characterSpacing = 0,
        private readonly lineSpacing = 0
    )
    {
        ensureRetroFontFrames(scene, textureKey, charWidth, charHeight);
        scene.textures.get(textureKey).setFilter(Textures.FilterMode.NEAREST);
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

        let column = 0;
        let row = 0;

        for (const character of normalizedText) {
            if (character === "\n") {
                column = 0;
                row += 1;
                continue;
            }

            const frameName = frameNameForCharacter(character);
            const letter = this.scene.add.image(
                column * (this.charWidth + this.characterSpacing),
                row * (this.charHeight + this.lineSpacing),
                this.textureKey,
                frameName
            )
                .setOrigin(0)
                .setTint(this.tint);

            this.container.add(letter);
            this.letters.push(letter);
            column += 1;
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
     * Scales the composed text block, used by the final congratulations message.
     */
    setScale(scale: number): void
    {
        this.container.setScale(scale);
    }

    /**
     * Places the composed text block above other screen overlays when needed.
     */
    setDepth(depth: number): void
    {
        this.container.setDepth(depth);
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
 * Adds named frames for each supported character in `fonts.png`.
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
