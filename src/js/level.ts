import { GameStates } from "./gameStates.ts";
import { LevelConstants } from "./levelConstants.ts";
import { LevelRevealSequence } from "./levelRevealSequence.ts";
import { EndGameSequence } from "./endGameSequence.ts";
import { Data } from "./data.ts";
import { LevelObjectLoader } from "./levelObjectLoader.ts";
import { LevelTransition } from "./levelTransition.ts";
import { Player } from "./player.ts";
import { HUD } from "./HUD.ts";
import { GameController } from "./gameController.ts";
import type { Monster } from "./monster.ts";

class LevelController
{
    // Current level and level-attempt data are stored privately. The legacy
    // property names remain available as read-only getters for existing checks.
    private currentLevel: number = LevelConstants.INITIAL_LEVEL;
    private currentAirLevel: number = LevelConstants.DEFAULT_AIR_LEVEL;
    private collectedKeys: number = 0;
    private bonusManAvailable = false;

    // Array which contains all monsters for a given level.
    monsters: Monster[] = [];

    // Group which contains the monsters (used for display order).
    monstersGroup: any = null;

    animationCounterMax = 0;
    animationCounter = 0;

    // Group which contains 'explosion' objects displayed when showing monsters.
    explosions: any = null;

    // Group which contains 'reverse explosion' objects displayed when hiding monsters of the previous level.
    reverseExplosions: any = null;

    // The end level object stores the position of the end's level.
    endLevel: any = null;

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

    initMonsters(): void
    {
        this.explosions = game.add.group();
        this.explosions.enableBody = true;

        this.reverseExplosions = game.add.group();
        this.reverseExplosions.enableBody = true;
    }

    /**
     * Add the monsters for the current level.
     * Tiled parsing and sprite creation are delegated to LevelObjectLoader.
     */
    addMonsters(): void
    {
        this.monsters = LevelObjectLoader.loadMonsters(this.currentLevel, this.monsters, this.monstersGroup);

        // Get the animation counter maximum used to set the animation's speed.
        this.animationCounterMax = Data.levels[this.currentLevel - 1][1];
        this.animationCounter = this.animationCounterMax;
    }

    /**
     * Update monsters position.
     */
    updateMonsters(): void
    {
        for (var i = 0; i < this.monsters.length; i++)
            this.monsters[i].updatePosition();
    }

    /**
     * Before displaying monsters, show 'explosions'.
     */
    displayMonsters(): void
    {
        this.explosions.removeAll(true);

        // Defensive fallback: all current levels have monsters, but if a future
        // level has none, do not leave the game stuck in DISPLAYING_MONSTERS.
        if (this.monsters.length == 0)
        {
            GameController.setState(GameStates.PLAYING);
            return;
        }

        const level = this;

        // Display an explosion for each monster.
        for (var i = 0; i < this.monsters.length; i++)
        {
            var explosion = this.explosions.create(this.monsters[i].firstPositionX, this.monsters[i].firstPositionY, LevelConstants.SPRITE_EXPLOSION);
            var anim = explosion.animations.add(LevelConstants.SPRITE_EXPLOSION);

            anim.onComplete.add(function()
            {
                // Show the monsters and start playing.
                for (var i = 0; i < level.monsters.length; i++)
                    level.monsters[i].sprite.visible = true;

                GameController.setState(GameStates.PLAYING);
            });

            explosion.animations.play(LevelConstants.SPRITE_EXPLOSION, LevelConstants.EXPLOSION_FRAME_RATE, false, true);
        }

        GameController.setState(GameStates.DISPLAYING_MONSTERS);
    }

    /**
     * Reset the game properties.
     */
    resetGame(): void
    {
        GameController.updateHiScoreIfNeeded();

        this.currentLevel = LevelConstants.INITIAL_LEVEL;
        GameController.resetScoreAndLives();

        LevelTransition.reset();
        EndGameSequence.reset();
        HUD.update();
    }

    /**
     * Move the player to the next level and increase score according to the air's level.
     */
    goToNext(): void
    {
        LevelTransition.update();
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

        Player.reset();
        this.addMonsters();
        this.endLevel = LevelObjectLoader.loadEndLevel(this.currentLevel, this.endLevel);
    }

    /**
     * Display progressively the map with two disappearing black rectangles.
     * The actual frame-by-frame sequence is handled by LevelRevealSequence.
     */
    display(): void
    {
        LevelRevealSequence.update();
    }
}

export const Level = new LevelController();
