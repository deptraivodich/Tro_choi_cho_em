// Game assets registry for Đua Về Đích (Race To Finish)
// Direct imports of extracted, pixel-accurate sprites with alpha transparency.

export const RACE_ASSETS = {
  background: require('./background.png'),

  characters: {
    fox: {
      idle_1: require('./characters/fox_idle_1.png'),
      idle_2: require('./characters/fox_idle_2.png'),
      walk_1: require('./characters/fox_walk_1.png'),
      walk_2: require('./characters/fox_walk_2.png'),
      penalty: require('./characters/fox_penalty.png'),
      victory: require('./characters/fox_victory.png'),
      avatar: require('./characters/fox_avatar.png'),
    },
    penguin: {
      idle_1: require('./characters/penguin_idle_1.png'),
      idle_2: require('./characters/penguin_idle_2.png'),
      walk_1: require('./characters/penguin_walk_1.png'),
      walk_2: require('./characters/penguin_walk_2.png'),
      penalty: require('./characters/penguin_penalty.png'),
      victory: require('./characters/penguin_victory.png'),
      avatar: require('./characters/penguin_avatar.png'),
    },
    bunny: {
      idle_1: require('./characters/bunny_idle_1.png'),
      idle_2: require('./characters/bunny_idle_2.png'),
      walk_1: require('./characters/bunny_walk_1.png'),
      walk_2: require('./characters/bunny_walk_2.png'),
      penalty: require('./characters/bunny_penalty.png'),
      victory: require('./characters/bunny_victory.png'),
      avatar: require('./characters/bunny_avatar.png'),
    },
    turtle: {
      idle_1: require('./characters/turtle_idle_1.png'),
      idle_2: require('./characters/turtle_idle_2.png'),
      walk_1: require('./characters/turtle_walk_1.png'),
      walk_2: require('./characters/turtle_walk_2.png'),
      penalty: require('./characters/turtle_penalty.png'),
      victory: require('./characters/turtle_victory.png'),
      avatar: require('./characters/turtle_avatar.png'),
    },
  },

  items: {
    wing: require('./items/wing.png'),
    shield: require('./items/shield.png'),
    cleanse: require('./items/cleanse.png'),
    back_arrow: require('./items/back_arrow.png'),
    hourglass: require('./items/hourglass.png'),
    portal: require('./items/portal.png'),
    dice_base: require('./items/dice_base.png'),
    trophy: require('./items/trophy.png'),
  },

  dice: {
    1: require('./dice/dice_1.png'),
    2: require('./dice/dice_2.png'),
    3: require('./dice/dice_3.png'),
    4: require('./dice/dice_4.png'),
    5: require('./dice/dice_5.png'),
    6: require('./dice/dice_6.png'),
  },

  tiles: {
    neutral: require('./tiles/tile_neutral.png'),
    bonus: require('./tiles/tile_bonus.png'),
    penalty: require('./tiles/tile_penalty.png'),
    finish: require('./tiles/tile_finish.png'),
  },

  ui: {
    header_sign: require('./ui/header_sign.png'),
    start_board: require('./ui/start_board.png'),
    modal_bonus_frame: require('./ui/modal_bonus_frame.png'),
    modal_penalty_frame: require('./ui/modal_penalty_frame.png'),
  },
  mapLandscape: require('./map_landscape.png'),
} as const;

export type CharacterType = keyof typeof RACE_ASSETS.characters;
export type CharacterPose = 'idle_1' | 'idle_2' | 'walk_1' | 'walk_2' | 'penalty' | 'victory' | 'avatar';
export type ItemType = keyof typeof RACE_ASSETS.items;
