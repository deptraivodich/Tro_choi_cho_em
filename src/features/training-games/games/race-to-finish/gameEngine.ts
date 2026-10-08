import { BoardTile, Player, TileActionType, PendingPenalty } from './types';
import { BOARD_TILES } from './boardConfig';

/**
 * Roll dice uniformly between 1 and 6.
 * Supports optional RNG function for deterministic testing.
 */
export function rollDice(rng: () => number = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

/**
 * Determine steps from dice value:
 * Odd (1, 3, 5) -> 1 step
 * Even (2, 4, 6) -> 2 steps
 */
export function calculateStepsFromDice(diceValue: number): number {
  return diceValue % 2 !== 0 ? 1 : 2;
}

/**
 * Check if a tile effect is considered a penalty
 */
export function isPenaltyTile(type: TileActionType): boolean {
  return type === 'retreat_1' || type === 'retreat_2' || type === 'reset_start' || type === 'skip_turn';
}

/**
 * Bot AI decision policy for using Cleanse Star when facing a penalty:
 * - reset_start (Tile 7) or retreat_2 (Tile 14): ALWAYS use Cleanse Star immediately.
 * - skip_turn (Tile 11, 19) or retreat_1 (Tile 4):
 *   If player position >= 10 (second half of the track), USE Cleanse Star to preserve lead;
 *   otherwise save it for worse penalties.
 */
export function decideBotCleanseUsage(penaltyType: TileActionType, currentPosition: number): boolean {
  if (penaltyType === 'reset_start' || penaltyType === 'retreat_2') {
    return true;
  }
  if (currentPosition >= 10) {
    return true;
  }
  return false;
}

export interface TileResolutionResult {
  nextPosition: number;
  hasShield: boolean;
  cleanseCount: number;
  skipNextTurn: boolean;
  consumedShield: boolean;
  consumedCleanse: boolean;
  needsCleanseChoice: boolean;
  pendingPenalty?: PendingPenalty;
  logMessage: string;
  effectType: 'none' | 'bonus' | 'penalty_blocked' | 'penalty_applied' | 'item_received' | 'win';
}

/**
 * Evaluate the landing tile for a player.
 * Checks shield, cleanse star, bonuses, penalties, and victory.
 */
export function evaluateLandingTile(
  player: Player,
  playerIndex: number,
  targetTileIndex: number
): TileResolutionResult {
  // Clamped position at finish line 21
  if (targetTileIndex >= 21) {
    return {
      nextPosition: 21,
      hasShield: player.hasShield,
      cleanseCount: player.cleanseCount,
      skipNextTurn: player.skipNextTurn,
      consumedShield: false,
      consumedCleanse: false,
      needsCleanseChoice: false,
      logMessage: `🏆 ${player.name} đã cán đích xuất sắc tại Ô 21 và giành chiến thắng!`,
      effectType: 'win',
    };
  }

  const tile = BOARD_TILES[targetTileIndex];
  if (!tile || tile.type === 'normal') {
    return {
      nextPosition: targetTileIndex,
      hasShield: player.hasShield,
      cleanseCount: player.cleanseCount,
      skipNextTurn: player.skipNextTurn,
      consumedShield: false,
      consumedCleanse: false,
      needsCleanseChoice: false,
      logMessage: `${player.name} dừng lại an toàn tại Ô ${targetTileIndex}.`,
      effectType: 'none',
    };
  }

  // Bonus: +1 Step
  if (tile.type === 'bonus_step_1') {
    const nextPos = Math.min(21, targetTileIndex + 1);
    return {
      nextPosition: nextPos,
      hasShield: player.hasShield,
      cleanseCount: player.cleanseCount,
      skipNextTurn: player.skipNextTurn,
      consumedShield: false,
      consumedCleanse: false,
      needsCleanseChoice: false,
      logMessage: `🪶 ${player.name} chạm Ô ${targetTileIndex}: Nhận Đôi Cánh Gió, tiến thêm +1 ô tới Ô ${nextPos}!`,
      effectType: 'bonus',
    };
  }

  // Bonus: +2 Steps
  if (tile.type === 'bonus_step_2') {
    const nextPos = Math.min(21, targetTileIndex + 2);
    return {
      nextPosition: nextPos,
      hasShield: player.hasShield,
      cleanseCount: player.cleanseCount,
      skipNextTurn: player.skipNextTurn,
      consumedShield: false,
      consumedCleanse: false,
      needsCleanseChoice: false,
      logMessage: `🪶 ${player.name} chạm Ô ${targetTileIndex}: Nhận Đôi Cánh Thần Kỳ, tiến thêm +2 ô tới Ô ${nextPos}!`,
      effectType: 'bonus',
    };
  }

  // Bonus: Shield Item (Tile 9)
  if (tile.type === 'shield') {
    const alreadyHas = player.hasShield;
    return {
      nextPosition: targetTileIndex,
      hasShield: true,
      cleanseCount: player.cleanseCount,
      skipNextTurn: player.skipNextTurn,
      consumedShield: false,
      consumedCleanse: false,
      needsCleanseChoice: false,
      logMessage: alreadyHas
        ? `🛡️ ${player.name} chạm Ô 9: Đã có Khiên Phép (tối đa 1 khiên, không cộng dồn).`
        : `🛡️ ${player.name} chạm Ô 9: Nhận được Khiên Phép tự động chặn hình phạt tiếp theo!`,
      effectType: 'item_received',
    };
  }

  // Bonus: Cleanse Star (Tile 13)
  if (tile.type === 'cleanse') {
    const alreadyHas = player.cleanseCount >= 1;
    return {
      nextPosition: targetTileIndex,
      hasShield: player.hasShield,
      cleanseCount: 1,
      skipNextTurn: player.skipNextTurn,
      consumedShield: false,
      consumedCleanse: false,
      needsCleanseChoice: false,
      logMessage: alreadyHas
        ? `✨ ${player.name} chạm Ô 13: Đã có Sao Giải Bất Lợi (tối đa 1 ngôi sao, không cộng dồn).`
        : `✨ ${player.name} chạm Ô 13: Nhận được Ngôi Sao Giải Bất Lợi! Có thể giữ để tự chọn hóa giải phạt.`,
      effectType: 'item_received',
    };
  }

  // Penalties: retreat_1, retreat_2, reset_start, skip_turn
  if (isPenaltyTile(tile.type)) {
    // 1. Shield automatically blocks the penalty
    if (player.hasShield) {
      return {
        nextPosition: targetTileIndex,
        hasShield: false, // shield consumed
        cleanseCount: player.cleanseCount,
        skipNextTurn: player.skipNextTurn,
        consumedShield: true,
        consumedCleanse: false,
        needsCleanseChoice: false,
        logMessage: `🛡️ KHIÊN PHÉP ĐÃ CHẶN PHẠT! ${player.name} rơi vào ${tile.shortDesc} ở Ô ${targetTileIndex}, nhưng Khiên Phép đã tan biến để bảo vệ an toàn!`,
        effectType: 'penalty_blocked',
      };
    }

    // 2. If player holds Cleanse Star and is human -> Ask choice
    // If bot -> Bot makes automatic decision
    if (player.cleanseCount > 0) {
      if (player.isBot) {
        const useCleanse = decideBotCleanseUsage(tile.type, targetTileIndex);
        if (useCleanse) {
          return {
            nextPosition: targetTileIndex,
            hasShield: false,
            cleanseCount: 0, // cleanse consumed
            skipNextTurn: player.skipNextTurn,
            consumedShield: false,
            consumedCleanse: true,
            needsCleanseChoice: false,
            logMessage: `✨ [Máy] ${player.name} đã dùng Ngôi Sao Giải Bất Lợi để hủy bỏ hình phạt ${tile.shortDesc}!`,
            effectType: 'penalty_blocked',
          };
        }
        // Bot chose to save cleanse -> fall through to apply penalty
      } else {
        // Human player holds cleanse star -> pause to prompt modal
        return {
          nextPosition: targetTileIndex,
          hasShield: false,
          cleanseCount: player.cleanseCount,
          skipNextTurn: player.skipNextTurn,
          consumedShield: false,
          consumedCleanse: false,
          needsCleanseChoice: true,
          pendingPenalty: {
            playerIndex,
            tileIndex: targetTileIndex,
            type: tile.type,
            penaltyName: tile.shortDesc,
            description: getPenaltyDescription(tile.type, targetTileIndex),
          },
          logMessage: `⚠️ ${player.name} rơi vào Ô ${targetTileIndex} (${tile.shortDesc}). Em có muốn dùng Ngôi Sao Giải Bất Lợi không?`,
          effectType: 'penalty_applied',
        };
      }
    }

    // 3. Apply penalty directly (no shield, no cleanse, or bot kept cleanse)
    return applyPenaltyDirectly(player, targetTileIndex, tile.type);
  }

  // Fallback
  return {
    nextPosition: targetTileIndex,
    hasShield: player.hasShield,
    cleanseCount: player.cleanseCount,
    skipNextTurn: player.skipNextTurn,
    consumedShield: false,
    consumedCleanse: false,
    needsCleanseChoice: false,
    logMessage: `${player.name} dừng tại Ô ${targetTileIndex}.`,
    effectType: 'none',
  };
}

/**
 * Apply penalty effect without shield or cleanse
 */
export function applyPenaltyDirectly(
  player: Player,
  targetTileIndex: number,
  penaltyType: TileActionType
): TileResolutionResult {
  let nextPos = targetTileIndex;
  let skipNext = player.skipNextTurn;
  let msg = '';

  if (penaltyType === 'retreat_1') {
    nextPos = Math.max(0, targetTileIndex - 1);
    msg = `🔙 Ô ${targetTileIndex}: ${player.name} bị lùi 1 ô về Ô ${nextPos}!`;
  } else if (penaltyType === 'retreat_2') {
    nextPos = Math.max(0, targetTileIndex - 2);
    msg = `🔙 Ô ${targetTileIndex}: ${player.name} bị lùi 2 ô về Ô ${nextPos}!`;
  } else if (penaltyType === 'reset_start') {
    nextPos = 0;
    msg = `🌀 CỔNG XOÁY HƯ KHÔNG! Ô ${targetTileIndex} đã hút ${player.name} quay về Vị trí Xuất phát (Ô 0)!`;
  } else if (penaltyType === 'skip_turn') {
    skipNext = true;
    msg = `⏳ ĐỒNG HỒ CÁT! Ô ${targetTileIndex} khiến ${player.name} bị mất lượt chơi kế tiếp!`;
  }

  return {
    nextPosition: nextPos,
    hasShield: player.hasShield,
    cleanseCount: player.cleanseCount,
    skipNextTurn: skipNext,
    consumedShield: false,
    consumedCleanse: false,
    needsCleanseChoice: false,
    logMessage: msg,
    effectType: 'penalty_applied',
  };
}

function getPenaltyDescription(type: TileActionType, tileIndex: number): string {
  switch (type) {
    case 'retreat_1':
      return `Lùi 1 ô (từ Ô ${tileIndex} về Ô ${Math.max(0, tileIndex - 1)})`;
    case 'retreat_2':
      return `Lùi 2 ô (từ Ô ${tileIndex} về Ô ${Math.max(0, tileIndex - 2)})`;
    case 'reset_start':
      return `Bị hút về Vị trí Xuất phát 0`;
    case 'skip_turn':
      return `Bỏ qua 1 lượt đổ xúc xắc tiếp theo`;
    default:
      return 'Hình phạt ô này';
  }
}
