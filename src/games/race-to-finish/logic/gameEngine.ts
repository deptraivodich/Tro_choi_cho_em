import {
  BonusEffectType,
  PenaltyEffectType,
} from '../types/index';
import { START_TILE_ID, isTileInFirstTen, getTile } from '../data/boardConfig';

/**
 * Roll dice uniformly between 1 and 6.
 * Supports optional RNG function for deterministic testing.
 */
export function rollDice(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

/**
 * NEW RULE:
 * Dice roll 1–6 moves exactly 1–6 steps uniformly.
 * "Xúc xắc ra bao nhiêu, đi bấy nhiêu"
 */
export function calculateStepsFromDice(diceValue: number): number {
  return Math.max(1, Math.min(6, Math.floor(diceValue)));
}

/**
 * Bonus roll pool configuration
 */
export interface BonusPoolConfig {
  options: { type: BonusEffectType; weight: number }[];
}

export const DEFAULT_BONUS_POOL: BonusPoolConfig = {
  options: [
    { type: 'advance_1', weight: 25 },
    { type: 'advance_2', weight: 25 },
    { type: 'shield', weight: 25 },
    { type: 'cleanse', weight: 25 },
  ],
};

/**
 * Penalty roll pool configuration.
 * Strictly separates first 10 tiles from tile 11+.
 */
export interface PenaltyPoolConfig {
  firstTenTiles: { type: PenaltyEffectType; weight: number }[];
  afterTenTiles: { type: PenaltyEffectType; weight: number }[];
}

export const DEFAULT_PENALTY_POOL: PenaltyPoolConfig = {
  firstTenTiles: [
    { type: 'retreat_1', weight: 25 },
    { type: 'retreat_2', weight: 25 },
    { type: 'skip_turn', weight: 25 },
    { type: 'reset_start', weight: 25 }, // Only valid within first 10 tiles!
  ],
  afterTenTiles: [
    { type: 'retreat_1', weight: 33.33 },
    { type: 'retreat_2', weight: 33.33 },
    { type: 'skip_turn', weight: 33.34 },
    // 'reset_start' is STRICTLY EXCLUDED from pool and has 0 probability!
  ],
};

/**
 * Roll a mystery bonus outcome from the weighted pool
 */
export function rollMysteryBonus(
  config: BonusPoolConfig = DEFAULT_BONUS_POOL,
  rng: () => number = Math.random
): BonusEffectType {
  const totalWeight = config.options.reduce((sum, opt) => sum + opt.weight, 0);
  let threshold = rng() * totalWeight;

  for (const opt of config.options) {
    if (threshold <= opt.weight) {
      return opt.type;
    }
    threshold -= opt.weight;
  }
  return config.options[0].type;
}

/**
 * Roll a mystery penalty outcome.
 * ENFORCEMENT:
 * - If tile is in first 10 tiles: allows 'reset_start'.
 * - If tile is from tile 11 onwards: strictly purged from pool, 0% chance.
 */
export function rollMysteryPenalty(
  tileId: string,
  config: PenaltyPoolConfig = DEFAULT_PENALTY_POOL,
  rng: () => number = Math.random
): PenaltyEffectType {
  const isFirstTen = isTileInFirstTen(tileId);
  const pool = (isFirstTen ? config.firstTenTiles : config.afterTenTiles)
    .filter(option => isFirstTen || option.type !== 'reset_start');
  if (!pool.length) throw new Error('Penalty pool has no valid outcomes');

  const totalWeight = pool.reduce((sum, opt) => sum + opt.weight, 0);
  let threshold = rng() * totalWeight;

  for (const opt of pool) {
    if (threshold <= opt.weight) {
      return opt.type;
    }
    threshold -= opt.weight;
  }
  return pool[0].type;
}

/**
 * Get valid penalty cards list for UI reel display.
 * Strictly excludes 'reset_start' if tile is outside the first 10 tiles.
 */
export function getPenaltyReelCards(tileId: string): PenaltyEffectType[] {
  const isFirstTen = isTileInFirstTen(tileId);
  if (isFirstTen) {
    return ['retreat_1', 'retreat_2', 'skip_turn', 'reset_start'];
  }
  return ['retreat_1', 'retreat_2', 'skip_turn'];
}

/**
 * Backtrack along player's visited history.
 * When penalized with retreat 1 or 2 steps, goes backwards along the exact path visited
 * (including shortcuts), never below START_TILE_ID.
 */
export function backtrackAlongHistory(
  pathHistory: string[],
  steps: number
): { destinationTileId: string; updatedHistory: string[] } {
  if (pathHistory.length <= 1 || steps <= 0) {
    return {
      destinationTileId: pathHistory[0] || START_TILE_ID,
      updatedHistory: [START_TILE_ID],
    };
  }

  const stepsToPop = Math.min(steps, pathHistory.length - 1);
  const updatedHistory = pathHistory.slice(0, pathHistory.length - stepsToPop);
  const destinationTileId = updatedHistory[updatedHistory.length - 1] || START_TILE_ID;

  return {
    destinationTileId,
    updatedHistory,
  };
}

/**
 * Get the next tile along the path given a branch selection.
 */
export function getNextTileId(
  currentTileId: string,
  branchChoice: 'main' | 'shortcut' = 'main'
): string {
  const tile = getTile(currentTileId);
  if (!tile) return START_TILE_ID;

  if (branchChoice === 'shortcut' && tile.nextTileIds.shortcut) {
    return tile.nextTileIds.shortcut;
  }
  return tile.nextTileIds.main || currentTileId;
}

/**
 * Check if a tile has a branching fork that requires player route decision.
 */
export function isForkTile(tileId: string): boolean {
  const tile = getTile(tileId);
  return Boolean(tile && tile.type === 'fork' && tile.nextTileIds.shortcut);
}

/**
 * Bot AI decision policy for choosing path at a fork.
 * Always prefers the shortcut because it significantly reduces distance to finish.
 */
export function decideBotForkChoice(): 'main' | 'shortcut' {
  return 'shortcut';
}

/**
 * Bot AI decision policy for using Cleanse Star when facing a penalty:
 * - reset_start or retreat_2: ALWAYS use Cleanse Star immediately.
 * - retreat_1 or skip_turn:
 *   If player order >= 20, USE Cleanse Star to maintain lead.
 *   Otherwise save it.
 */
export function decideBotCleanseUsage(penaltyType: PenaltyEffectType, playerTileOrder: number): boolean {
  if (penaltyType === 'reset_start' || penaltyType === 'retreat_2') {
    return true;
  }
  if (playerTileOrder >= 20) {
    return true;
  }
  return false;
}

/**
 * Human-readable metadata and labels for bonus effects
 */
export const BONUS_METADATA: Record<
  BonusEffectType,
  { title: string; desc: string; iconKey: 'wing' | 'shield' | 'cleanse' }
> = {
  advance_1: {
    title: 'Tiến thêm 1 ô',
    desc: 'Được lướt gió tiến thẳng thêm 1 ô phía trước!',
    iconKey: 'wing',
  },
  advance_2: {
    title: 'Tiến thêm 2 ô',
    desc: 'Được cơn lốc đẩy tiến vượt bậc thêm 2 ô phía trước!',
    iconKey: 'wing',
  },
  shield: {
    title: 'Nhận Khiên Thần',
    desc: 'Tự động bảo vệ và chặn 1 hình phạt trong tương lai!',
    iconKey: 'shield',
  },
  cleanse: {
    title: 'Quyền Giải Bất Lợi',
    desc: 'Giữ Ngôi Sao Hóa Giải để chủ động giải cứu khi gặp phạt!',
    iconKey: 'cleanse',
  },
};

/**
 * Human-readable metadata and labels for penalty effects
 */
export const PENALTY_METADATA: Record<
  PenaltyEffectType,
  { title: string; desc: string; iconKey: 'back_arrow' | 'hourglass' | 'portal' }
> = {
  retreat_1: {
    title: 'Lùi 1 ô',
    desc: 'Bị trượt chân, lùi lại 1 ô theo đường vừa đi!',
    iconKey: 'back_arrow',
  },
  retreat_2: {
    title: 'Lùi 2 ô',
    desc: 'Gặp chướng ngại vật, lùi lại 2 ô theo đường vừa đi!',
    iconKey: 'back_arrow',
  },
  skip_turn: {
    title: 'Mất 1 lượt',
    desc: 'Đồng hồ cát dừng lại, bạn phải nghỉ 1 lượt kế tiếp!',
    iconKey: 'hourglass',
  },
  reset_start: {
    title: 'Về xuất phát',
    desc: 'Cổng xoáy cuốn bạn quay trở lại vạch xuất phát ban đầu!',
    iconKey: 'portal',
  },
};
