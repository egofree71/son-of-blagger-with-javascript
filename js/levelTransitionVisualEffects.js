/**
 * Visual effects used by the end-level transition.
 *
 * The transition itself is controlled by LevelTransition. This object only owns
 * the rendering details: background flash, hiding old monsters, and reverse
 * explosions at their last positions.
 */
var LevelTransitionVisualEffects =
{
    flashBackground : function()
    {
        game.stage.backgroundColor = LevelConstants.STAGE_COLOR_TRANSITION;
    },

    restoreBackground : function()
    {
        game.stage.backgroundColor = LevelConstants.STAGE_COLOR_NORMAL;
    },

    hideCompletedLevelMonsters : function()
    {
        for (var i = 0; i < Level.monsters.length; i++)
            Level.monsters[i].sprite.visible = false;
    },

    playReverseExplosions : function()
    {
        Level.reverseExplosions.removeAll(true);

        for (var i = 0; i < Level.monsters.length; i++)
            this.playReverseExplosionAtMonster(Level.monsters[i]);
    },

    playReverseExplosionAtMonster : function(monster)
    {
        var reverseExplosion = Level.reverseExplosions.create(
            monster.sprite.body.x,
            monster.sprite.body.y,
            LevelConstants.SPRITE_REVERSE_EXPLOSION
        );

        reverseExplosion.animations.add(LevelConstants.SPRITE_REVERSE_EXPLOSION);
        reverseExplosion.animations.play(LevelConstants.SPRITE_REVERSE_EXPLOSION, LevelConstants.EXPLOSION_FRAME_RATE, false, true);
    }
};
