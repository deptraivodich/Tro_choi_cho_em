// Game assets registry for Đua Về Đích (Race To Finish)
// Direct imports of extracted, pixel-accurate sprites with alpha transparency.

export const RACE_ASSETS = {
  background: require('../../../../../assets/games/race-to-finish/background.png'),

  characters: {
    fox: {
      idle_1: require('../../../../../assets/games/race-to-finish/characters/fox_idle_1.png'),
      idle_2: require('../../../../../assets/games/race-to-finish/characters/fox_idle_2.png'),
      walk_1: require('../../../../../assets/games/race-to-finish/characters/fox_walk_1.png'),
      walk_2: require('../../../../../assets/games/race-to-finish/characters/fox_walk_2.png'),
      penalty: require('../../../../../assets/games/race-to-finish/characters/fox_penalty.png'),
      victory: require('../../../../../assets/games/race-to-finish/characters/fox_victory.png'),
      avatar: require('../../../../../assets/games/race-to-finish/characters/fox_avatar.png'),
    },
    penguin: {
      idle_1: require('../../../../../assets/games/race-to-finish/characters/penguin_idle_1.png'),
      idle_2: require('../../../../../assets/games/race-to-finish/characters/penguin_idle_2.png'),
      walk_1: require('../../../../../assets/games/race-to-finish/characters/penguin_walk_1.png'),
      walk_2: require('../../../../../assets/games/race-to-finish/characters/penguin_walk_2.png'),
      penalty: require('../../../../../assets/games/race-to-finish/characters/penguin_penalty.png'),
      victory: require('../../../../../assets/games/race-to-finish/characters/penguin_victory.png'),
      avatar: require('../../../../../assets/games/race-to-finish/characters/penguin_avatar.png'),
    },
    bunny: {
      idle_1: require('../../../../../assets/games/race-to-finish/characters/bunny_idle_1.png'),
      idle_2: require('../../../../../assets/games/race-to-finish/characters/bunny_idle_2.png'),
      walk_1: require('../../../../../assets/games/race-to-finish/characters/bunny_walk_1.png'),
      walk_2: require('../../../../../assets/games/race-to-finish/characters/bunny_walk_2.png'),
      penalty: require('../../../../../assets/games/race-to-finish/characters/bunny_penalty.png'),
      victory: require('../../../../../assets/games/race-to-finish/characters/bunny_victory.png'),
      avatar: require('../../../../../assets/games/race-to-finish/characters/bunny_avatar.png'),
    },
    turtle: {
      idle_1: require('../../../../../assets/games/race-to-finish/characters/turtle_idle_1.png'),
      idle_2: require('../../../../../assets/games/race-to-finish/characters/turtle_idle_2.png'),
      walk_1: require('../../../../../assets/games/race-to-finish/characters/turtle_walk_1.png'),
      walk_2: require('../../../../../assets/games/race-to-finish/characters/turtle_walk_2.png'),
      penalty: require('../../../../../assets/games/race-to-finish/characters/turtle_penalty.png'),
      victory: require('../../../../../assets/games/race-to-finish/characters/turtle_victory.png'),
      avatar: require('../../../../../assets/games/race-to-finish/characters/turtle_avatar.png'),
    },
  },

  items: {
    wing: require('../../../../../assets/games/race-to-finish/items/wing.png'),
    shield: require('../../../../../assets/games/race-to-finish/items/shield.png'),
    cleanse: require('../../../../../assets/games/race-to-finish/items/cleanse.png'),
    back_arrow: require('../../../../../assets/games/race-to-finish/items/back_arrow.png'),
    hourglass: require('../../../../../assets/games/race-to-finish/items/hourglass.png'),
    portal: require('../../../../../assets/games/race-to-finish/items/portal.png'),
    dice_base: require('../../../../../assets/games/race-to-finish/items/dice_base.png'),
    trophy: require('../../../../../assets/games/race-to-finish/items/trophy.png'),
  },

  dice: {
    1: require('../../../../../assets/games/race-to-finish/dice/dice_1.png'),
    2: require('../../../../../assets/games/race-to-finish/dice/dice_2.png'),
    3: require('../../../../../assets/games/race-to-finish/dice/dice_3.png'),
    4: require('../../../../../assets/games/race-to-finish/dice/dice_4.png'),
    5: require('../../../../../assets/games/race-to-finish/dice/dice_5.png'),
    6: require('../../../../../assets/games/race-to-finish/dice/dice_6.png'),
  },

  tiles: {
    neutral: require('../../../../../assets/games/race-to-finish/tiles/tile_neutral.png'),
    bonus: require('../../../../../assets/games/race-to-finish/tiles/tile_bonus.png'),
    penalty: require('../../../../../assets/games/race-to-finish/tiles/tile_penalty.png'),
    finish: require('../../../../../assets/games/race-to-finish/tiles/tile_finish.png'),
  },

  ui: {
    header_sign: require('../../../../../assets/games/race-to-finish/ui/header_sign.png'),
    start_board: require('../../../../../assets/games/race-to-finish/ui/start_board.png'),
  },
} as const;

export type CharacterType = keyof typeof RACE_ASSETS.characters;
export type CharacterPose = 'idle_1' | 'idle_2' | 'walk_1' | 'walk_2' | 'penalty' | 'victory' | 'avatar';
export type ItemType = keyof typeof RACE_ASSETS.items;
