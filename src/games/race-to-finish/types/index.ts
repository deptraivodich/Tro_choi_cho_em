// Types definition for Đua Về Đích (Race To Finish) - Landscape Forest Board

export type CharacterId = 'fox' | 'penguin' | 'bunny' | 'turtle';
export type CharacterPose = 'idle_1' | 'idle_2' | 'walk_1' | 'walk_2' | 'penalty' | 'victory' | 'avatar';

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  defaultPlayerName: string;
  color: string;
  borderColor: string;
  bgTint: string;
}

export const CHARACTERS_META: Record<CharacterId, CharacterMeta> = {
  fox: {
    id: 'fox',
    name: 'Cáo Lém Lĩnh',
    defaultPlayerName: 'Cáo Con',
    color: '#F97316',
    borderColor: '#EA580C',
    bgTint: '#FFEDD5',
  },
  penguin: {
    id: 'penguin',
    name: 'Chim Cánh Cụt',
    defaultPlayerName: 'Cánh Cụt',
    color: '#0EA5E9',
    borderColor: '#0284C7',
    bgTint: '#E0F2FE',
  },
  bunny: {
    id: 'bunny',
    name: 'Thỏ Bông Tím',
    defaultPlayerName: 'Thỏ Tím',
    color: '#A855F7',
    borderColor: '#9333EA',
    bgTint: '#F3E8FF',
  },
  turtle: {
    id: 'turtle',
    name: 'Rùa Kiên Trì',
    defaultPlayerName: 'Rùa Xanh',
    color: '#10B981',
    borderColor: '#059669',
    bgTint: '#D1FAE5',
  },
};

export type GameMode = 'single' | 'local_multiplayer';

export interface Player {
  id: string;
  name: string;
  character: CharacterId;
  isBot: boolean;
  currentTileId: string; // 'tile_0' (start) up to 'tile_49' (finish)
  pathHistory: string[]; // stack of visited tile IDs for precise backtracking
  position: number;      // actual main-route order from boardConfig, used for ranking and stats
  hasShield: boolean;    // max 1 shield
  cleanseCount: number;  // max 1 cleanse star
  skipNextTurn: boolean; // if true, skipped once on next turn then reset
  currentPose: CharacterPose;
  rank: number | null;   // 1, 2, 3... when crossing finish line
}

export type TileType = 'start' | 'normal' | 'bonus' | 'penalty' | 'fork' | 'merge' | 'finish';

export interface BoardTile {
  id: string;
  order: number; // steps from start along the visible main path; independent of the stable tile ID
  type: TileType;
  xPercent: number; // 0..100% of board width
  yPercent: number; // 0..100% of board height
  nextTileIds: {
    main?: string;
    shortcut?: string;
  };
  isFirstTenTiles: boolean; // true ONLY for tiles 1..10 on main path
  label: string;
  shortDesc: string;
}

export type BonusEffectType = 'advance_1' | 'advance_2' | 'shield' | 'cleanse';
export type PenaltyEffectType = 'retreat_1' | 'retreat_2' | 'skip_turn' | 'reset_start';

export type GamePhase =
  | 'setup'                   // picking game mode, players
  | 'ready_to_roll'           // awaiting active player / bot roll
  | 'rolling'                 // dice roll animation
  | 'showing_question'
  | 'evaluating_answer'
  | 'closing_answer'         // wait for feedback opacity to reach zero before movement
  | 'turn_end'
  | 'moving'                  // step-by-step movement
  | 'evaluating_tile'         // arriving at destination tile
  | 'rolling_mystery'         // spinning bonus or penalty reel
  | 'mystery_result'          // displaying result, claiming or applying
  | 'awaiting_cleanse_choice' // modal: player chooses to use cleanse star
  | 'applying_effect'         // executing penalty / bonus displacement
  | 'turn_handover'           // local multiplayer handover alert
  | 'paused'                  // game paused
  | 'finished';               // winner announced, celebration

export interface GameLogEntry {
  id: string;
  text: string;
  type: 'info' | 'dice' | 'bonus' | 'penalty' | 'item' | 'win';
  timestamp: number;
}

export interface MysteryRollState {
  id: number;
  type: 'bonus' | 'penalty';
  tileId: string;
  playerIndex: number;
  result: BonusEffectType | PenaltyEffectType;
  hasShieldProtection: boolean;
  canUseCleanse: boolean;
}

export interface PendingPenalty {
  playerIndex: number;
  tileIndex: number;
  type: string;
  penaltyName: string;
  description: string;
}
