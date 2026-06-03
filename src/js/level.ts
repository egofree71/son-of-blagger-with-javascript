import { LevelConstants } from "./levelConstants.ts";
import { Data } from "./data.ts";
import { LevelObjectLoader } from "./levelObjectLoader.ts";
import { Player } from "./player.ts";
import type { Monster } from "./monster.ts";

class LevelController
{
    // Current level and level-attempt data are stored privately. The legacy
    // property names remain available as read-only getters for existing checks.
    private currentLevel: number = LevelConstants.INITIAL_LEVEL;
    private currentAirLevel: number = LevelConstants.DEFAULT_AIR_LEVEL;
    private collectedKeys: number = 0;
    private bonusManAvailable = false;

    // Runtime objects owned by the current level.
    private currentMonsters: Monster[] = [];
    private monsterDisplayGroup: any = null;
    private monsterAnimationCounterMax = 0;
    private monsterAnimationCounter = 0;
    private explosionGroup: any = null;
    private reverseExplosionGroup: any = null;
    private levelExit: any = null;

    get level(): number
    {
        return this.currentLevel;
    }

    get airLevel(): number
    {
        return this.currentAirLevel;
    }

    get keysTaken(): number
    {
        return this.collectedKeys;
    }

    get bonusMan(): boolean
    {
        return this.bonusManAvailable;
    }

    resetAirLevel(): void
    {
        this.currentAirLevel = LevelConstants.DEFAULT_AIR_LEVEL;
    }

    decreaseAir(amount: number): void
    {
        this.currentAirLevel -= amount;
    }

    increaseAir(amount: number): void
    {
        this.currentAirLevel += amount;
    }

    advanceToNextLevel(): void
    {
        this.currentLevel += 1;
    }

    collectKey(): void
    {
        this.collectedKeys += 1;
    }

    hasCollectedAllKeys(): boolean
    {
        return this.collectedKeys == Data.levels[this.currentLevel - 1][0];
    }

    isLastLevel(): boolean
    {
        return this.currentLevel == Data.levels.length;
    }

    enableBonusMan(): void
    {
        this.bonusManAvailable = true;
    }

    consumeBonusMan(): boolean
    {
        if (!this.bonusManAvailable)
            return false;

        this.bonusManAvailable = false;
        return true;
    }

    /**
     * Creates the Phaser group used to own monster sprites.
     *
     * The group remains internal to Level; LevelObjectLoader receives it only
     * while Level.load() is creating the current level objects.
     */
    createMonstersGroup(): void
    {
        this.monsterDisplayGroup = game.add.group();
    }

    /**
     * Creates Phaser groups used by monster reveal / reverse reveal effects.
     */
    initMonsters(): void
    {
        this.explosionGroup = game.add.group();
        this.explosionGroup.enableBody = true;

        this.reverseExplosionGroup = game.add.group();
        this.reverseExplosionGroup.enableBody = true;
    }

    /**
     * Add the monsters for the current level.
     * Tiled parsing and sprite creation are delegated to LevelObjectLoader.
     */
    addMonsters(): void
    {
        this.currentMonsters = LevelObjectLoader.loadMonsters(this.currentLevel, this.currentMonsters, this.monsterDisplayGroup);

        // Get the animation counter maximum used to set the animation's speed.
        this.monsterAnimationCounterMax = Data.levels[this.currentLevel - 1][1];
        this.monsterAnimationCounter = this.monsterAnimationCounterMax;
    }

    /**
     * Update monsters position.
     */
    updateMonsters(isPlaying: boolean): void
    {
        if (!isPlaying) return;

        for (var i = 0; i < this.currentMonsters.length; i++)
            this.currentMonsters[i].updatePosition(this.shouldAdvanceMonsterAnimation());
    }

    /**
     * Advances the shared monster animation counter.
     *
     * Level owns the shared animation cadence and gives each monster a simple
     * boolean telling it whether to advance its sprite animation this frame.
     */
    private shouldAdvanceMonsterAnimation(): boolean
    {
        this.monsterAnimationCounter -= 1;

        if (this.monsterAnimationCounter != 0)
            return false;

        this.monsterAnimationCounter = this.monsterAnimationCounterMax;
        return true;
    }

    /**
     * Checks whether the given rectangle collides with one of the current monsters.
     */
    collidesWithMonster(playerRectangle: any): boolean
    {
        for (var i = 0; i < this.currentMonsters.length; i++)
        {
            var monster = this.currentMonsters[i];

            // Set the collision area for the monster.
            var monsterRectangle = new Phaser.Rectangle(
                monster.sprite.x + monster.collisionOffsetX,
                monster.sprite.y + monster.collisionOffsetY,
                monster.realWidth,
                monster.realHeight);

            if (Phaser.Rectangle.intersects(playerRectangle, monsterRectangle))
                return true;
        }

        return false;
    }

    /**
     * Checks whether the given coordinate area collides with one of the current monsters.
     *
     * This keeps monster collision ownership inside Level instead of making the
     * generic tile CollisionDetector depend on level runtime state.
     */
    collidesWithMonsterArea(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean
    {
        return this.collidesWithMonster(this.createCollisionRectangle(xStart, yStart, xEnd, yEnd));
    }

    /**
     * Checks whether the given rectangle collides with the current level exit.
     */
    collidesWithExit(playerRectangle: any): boolean
    {
        var endLevelRectangle = new Phaser.Rectangle(this.levelExit.x, this.levelExit.y, this.levelExit.width, this.levelExit.height);
        return Phaser.Rectangle.intersects(playerRectangle, endLevelRectangle);
    }

    /**
     * Checks whether the given coordinate area collides with the current level exit.
     *
     * This keeps exit collision ownership inside Level instead of making the
     * generic tile CollisionDetector depend on level runtime state.
     */
    collidesWithExitArea(xStart: number, yStart: number, xEnd: number, yEnd: number): boolean
    {
        return this.collidesWithExit(this.createCollisionRectangle(xStart, yStart, xEnd, yEnd));
    }

    /**
     * Creates a Phaser rectangle from the same coordinate convention previously
     * used by CollisionDetector.collisionRectangleWithMonsters/EndLevel.
     */
    private createCollisionRectangle(xStart: number, yStart: number, xEnd: number, yEnd: number): any
    {
        return new Phaser.Rectangle(xStart, yStart, xEnd - xStart, yEnd - yStart);
    }

    /**
     * Before displaying monsters, show 'explosions'.
     *
     * Returns true when an asynchronous reveal animation has started. Returns
     * false when there are no monsters and the caller can immediately continue.
     */
    displayMonsters(onComplete: () => void): boolean
    {
        this.explosionGroup.removeAll(true);

        // Defensive fallback: all current levels have monsters, but if a future
        // level has none, do not leave the game stuck before gameplay starts.
        if (this.currentMonsters.length == 0)
        {
            onComplete();
            return false;
        }

        const level = this;

        // Display an explosion for each monster.
        for (var i = 0; i < this.currentMonsters.length; i++)
        {
            var explosion = this.explosionGroup.create(this.currentMonsters[i].firstPositionX, this.currentMonsters[i].firstPositionY, LevelConstants.SPRITE_EXPLOSION);
            var anim = explosion.animations.add(LevelConstants.SPRITE_EXPLOSION);

            anim.onComplete.add(function()
            {
                level.showMonsters();
                onComplete();
            });

            explosion.animations.play(LevelConstants.SPRITE_EXPLOSION, LevelConstants.EXPLOSION_FRAME_RATE, false, true);
        }

        return true;
    }

    /**
     * Shows all current monster sprites after the reveal animation finishes.
     */
    private showMonsters(): void
    {
        for (var i = 0; i < this.currentMonsters.length; i++)
            this.currentMonsters[i].sprite.visible = true;
    }

    /**
     * Hides monsters from the completed level and creates reverse explosions at
     * their last positions.
     */
    hideMonstersWithReverseExplosions(): void
    {
        for (var i = 0; i < this.currentMonsters.length; i++)
            this.currentMonsters[i].sprite.visible = false;

        this.reverseExplosionGroup.removeAll(true);

        for (var j = 0; j < this.currentMonsters.length; j++)
        {
            var reverseExplosion = this.reverseExplosionGroup.create(this.currentMonsters[j].sprite.body.x, this.currentMonsters[j].sprite.body.y, LevelConstants.SPRITE_REVERSE_EXPLOSION);
            reverseExplosion.animations.add(LevelConstants.SPRITE_REVERSE_EXPLOSION);
            reverseExplosion.animations.play(LevelConstants.SPRITE_REVERSE_EXPLOSION, LevelConstants.EXPLOSION_FRAME_RATE, false, true);
        }
    }

    /**
     * Reset runtime state owned directly by Level.
     *
     * Score, lives and visual sequence state are owned by GameController or the
     * corresponding sequence objects and are reset by the caller.
     */
    resetGame(): void
    {
        this.currentLevel = LevelConstants.INITIAL_LEVEL;
    }

    /**
     * Reset runtime data that belongs to the current level attempt.
     */
    resetLevelState(): void
    {
        this.currentAirLevel = LevelConstants.DEFAULT_AIR_LEVEL;
        this.collectedKeys = 0;
        this.bonusManAvailable = false;
    }

    /**
     * Load the objects needed for a given level.
     */
    load(): void
    {
        this.resetLevelState();

        Player.reset(this.currentLevel);
        this.addMonsters();
        this.levelExit = LevelObjectLoader.loadEndLevel(this.currentLevel, this.levelExit);
    }

}

export const Level = new LevelController();
