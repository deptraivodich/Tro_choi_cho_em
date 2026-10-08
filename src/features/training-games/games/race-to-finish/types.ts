// Types definition for Đua Về Đích (Race To Finish)

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
  position: number; // 0 (start plank) up to 21 (finish line)
  hasShield: boolean; // max 1 shield
  cleanseCount: number; // max 1 cleanse star
  skipNextTurn: boolean; // if true, skipped once on next turn then reset
  currentPose: CharacterPose;
  rank: number | null; // 1, 2, 3... when crossing finish line
}

export type TileActionType =
  | 'normal'
  | 'bonus_step_1' // tiles 2, 17 (+1 step)
  | 'bonus_step_2' // tile 5 (+2 steps)
  | 'shield'       // tile 9 (auto blocks next penalty)
  | 'cleanse'      // tile 13 (cleanse star, held to use)
  | 'retreat_1'    // tile 4 (-1 step)
  | 'retreat_2'    // tile 14 (-2 steps)
  | 'reset_start'  // tile 7 (back to start 0)
  | 'skip_turn'    // tiles 11, 19 (skip next turn)
  | 'finish';      // tile 21 (victory)

export interface BoardTile {
  index: number; // 1 to 21
  type: TileActionType;
  row: number; // 0 (bottom) to 6 (top)
  col: number; // 0, 1, 2 (left, center, right)
  direction: 'right' | 'left'; // direction of movement along the row
  label: string;
  shortDesc: string;
  itemKey?: 'wing' | 'shield' | 'cleanse' | 'back_arrow' | 'hourglass' | 'portal' | 'trophy';
  bonusValue?: number;
  tileStyle: 'neutral' | 'bonus' | 'penalty' | 'finish';
}

export type GamePhase =
  | 'setup'                   // picking game mode, players
  | 'ready_to_roll'           // awaiting active player / bot roll
  | 'rolling'                 // 0.7s dice roll animation
  | 'moving'                  // step-by-step 0.25s per tile movement
  | 'evaluating_tile'         // checking tile effect
  | 'awaiting_cleanse_choice' // modal: player chooses to use cleanse star
  | 'applying_effect'         // executing penalty / bonus / portal movement
  | 'turn_handover'           // local multiplayer handover alert
  | 'finished';               // winner announced, celebration

export interface GameLogEntry {
  id: string;
  text: string;
  type: 'info' | 'dice' | 'bonus' | 'penalty' | 'item' | 'win';
  timestamp: number;
}

export interface PendingPenalty {
  playerIndex: number;
  tileIndex: number;
  type: TileActionType;
  penaltyName: string;
  description: string;
}
