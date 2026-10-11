import {
  calculateStepsFromDice,
  rollDice,
  rollMysteryBonus,
  rollMysteryPenalty,
  backtrackAlongHistory,
  getNextTileId,
  isForkTile,
  decideBotForkChoice,
  decideBotCleanseUsage,
  getPenaltyReelCards,
} from '../logic/gameEngine';
import { Player } from '../types/index';
import { BOARD_TILES, isTileInFirstTen, START_TILE_ID, FINISH_TILE_ID } from '../data/boardConfig';

// Midpoints of a uniform grid verify actual weighted selection, without flaky
// random-frequency assertions or merely copying configuration into expectations.
test('weighted bonus selection reduces both inventory rewards moderately', () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 10000; i++) {
    const result = rollMysteryBonus(undefined, () => (i + 0.5) / 10000);
    counts[result] = (counts[result] ?? 0) + 1;
  }
  expect(counts).toEqual({ advance_1: 3200, advance_2: 3200, shield: 1800, cleanse: 1800 });
});

test('reset weight rises slightly early and remains zero at every actual tile from 11 onward', () => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 10000; i++) {
    const result = rollMysteryPenalty('tile_5', undefined, () => (i + 0.5) / 10000);
    counts[result] = (counts[result] ?? 0) + 1;
  }
  expect(counts).toEqual({ retreat_1: 2400, retreat_2: 2300, skip_turn: 2300, reset_start: 3000 });
  for (const tile of Object.values(BOARD_TILES).filter(t => t.order >= 11))
    for (let i = 0; i < 100; i++)
      expect(rollMysteryPenalty(tile.id, undefined, () => (i + 0.5) / 100)).not.toBe('reset_start');
});

describe('Đua Về Đích - New Rules & Graph Engine Tests', () => {
  const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: 'p1',
    name: 'Cáo',
    character: 'fox',
    isBot: false,
    currentTileId: START_TILE_ID,
    pathHistory: [START_TILE_ID],
    position: 0,
    hasShield: false,
    cleanseCount: 0,
    skipNextTurn: false,
    currentPose: 'idle_1',
    rank: null,
    ...overrides,
  });

  describe('1. Dice Roll and Exact Step Rule ("Xúc xắc ra bao nhiêu, đi bấy nhiêu")', () => {
    it('moves exactly 1 to 6 steps corresponding to dice value (uniform 1-6)', () => {
      expect(calculateStepsFromDice(1)).toBe(1);
      expect(calculateStepsFromDice(2)).toBe(2);
      expect(calculateStepsFromDice(3)).toBe(3);
      expect(calculateStepsFromDice(4)).toBe(4);
      expect(calculateStepsFromDice(5)).toBe(5);
      expect(calculateStepsFromDice(6)).toBe(6);
    });

    it('generates uniform numbers 1 to 6 with injected rng', () => {
      expect(rollDice(() => 0.0)).toBe(1);
      expect(rollDice(() => 0.2)).toBe(2);
      expect(rollDice(() => 0.4)).toBe(3);
      expect(rollDice(() => 0.6)).toBe(4);
      expect(rollDice(() => 0.8)).toBe(5);
      expect(rollDice(() => 0.999)).toBe(6);
    });
  });

  describe('2. Board Map Structure & First 10 Tiles Definition', () => {
    it('contains the stable Start and Finish IDs and properly defined nodes', () => {
      expect(BOARD_TILES[START_TILE_ID].type).toBe('start');
      expect(BOARD_TILES[FINISH_TILE_ID].type).toBe('finish');
    });

    it('marks the first ten visible circles, independent of the historical numeric ID', () => {
      expect(isTileInFirstTen('tile_1')).toBe(true);
      expect(isTileInFirstTen('tile_5')).toBe(true);
      expect(isTileInFirstTen('tile_8')).toBe(true);
      expect(isTileInFirstTen('tile_8_mid')).toBe(true);
      expect(isTileInFirstTen('tile_9')).toBe(false);
      expect(isTileInFirstTen('tile_10')).toBe(false);
      expect(isTileInFirstTen('tile_11')).toBe(false);
      expect(isTileInFirstTen('tile_15')).toBe(false);
      expect(isTileInFirstTen('tile_26')).toBe(false);
      expect(isTileInFirstTen('tile_34')).toBe(false);
    });

    it('identifies fork tiles correctly at tile_4 and tile_16', () => {
      expect(isForkTile('tile_4')).toBe(true);
      expect(isForkTile('tile_16')).toBe(true);
      expect(isForkTile('tile_1')).toBe(false);
    });
  });

  describe('3. Shortcut Branching & Path Connectivity', () => {
    it('branches correctly at Fork 1 (tile_4)', () => {
      const mainNext = getNextTileId('tile_4', 'main');
      const shortcutNext = getNextTileId('tile_4', 'shortcut');

      expect(mainNext).toBe('tile_4_bonus');
      expect(shortcutNext).toBe('tile_8_mid'); // first blue circle at the painted shortcut exit
    });

    it('branches correctly at Fork 2 (tile_16)', () => {
      const mainNext = getNextTileId('tile_16', 'main');
      const shortcutNext = getNextTileId('tile_16', 'shortcut');

      expect(mainNext).toBe('tile_17');
      expect(shortcutNext).toBe('tile_30'); // shortcut merges into tile_30!
    });

    it('bot chooses shortcut at fork', () => {
      expect(decideBotForkChoice()).toBe('shortcut');
    });
  });

  describe('4. Strict Enforcement of "Về xuất phát" (Reset to Start) Constraint', () => {
    it('allows "reset_start" in penalty pool ONLY for first 10 visible circles (e.g. tile_5)', () => {
      const cardsInFirstTen = getPenaltyReelCards('tile_5');
      expect(cardsInFirstTen).toContain('reset_start');

      // Sample 200 rolls with seeded random
      const results = new Set<string>();
      for (let i = 0; i < 200; i++) {
        results.add(rollMysteryPenalty('tile_5', undefined, () => (i % 4) / 4 + 0.01));
      }
      expect(results.has('reset_start')).toBe(true);
    });

    it('STRICTLY PURGES "reset_start" from tile 11 onwards across 1,000 random samples', () => {
      const cardsAfterTen = getPenaltyReelCards('tile_15');
      expect(cardsAfterTen).not.toContain('reset_start');

      // Test tiles 15, 26, 34, 39, 46
      const tilesToTest = ['tile_15', 'tile_26', 'tile_34', 'tile_39', 'tile_46'];
      for (const t of tilesToTest) {
        for (let i = 0; i < 200; i++) {
          const outcome = rollMysteryPenalty(t, undefined, () => Math.random());
          expect(outcome).not.toBe('reset_start');
        }
      }
    });
  });

  describe('5. Path History and Accurate Backtracking', () => {
    it('backtracks along exact history for retreat 1', () => {
      const history = ['tile_0', 'tile_1', 'tile_2', 'tile_3'];
      const res = backtrackAlongHistory(history, 1);
      expect(res.destinationTileId).toBe('tile_2');
      expect(res.updatedHistory).toEqual(['tile_0', 'tile_1', 'tile_2']);
    });

    it('backtracks through shortcuts if the player took a shortcut', () => {
      const history = ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_8_mid', 'tile_9'];
      const res = backtrackAlongHistory(history, 2);
      // Backtrack from the circle after the shortcut exit to its exact entrance.
      expect(res.destinationTileId).toBe('tile_4');
      expect(res.updatedHistory).toEqual(['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4']);
    });

    it('does not backtrack below Start tile_0', () => {
      const history = ['tile_0', 'tile_1'];
      const res = backtrackAlongHistory(history, 5);
      expect(res.destinationTileId).toBe('tile_0');
      expect(res.updatedHistory).toEqual(['tile_0']);
    });
  });

  describe('6. Mystery Bonus and Items (Shield, Cleanse)', () => {
    it('rolls all valid bonus types from pool', () => {
      const b1 = rollMysteryBonus(undefined, () => 0.1);
      const b2 = rollMysteryBonus(undefined, () => 0.3);
      const b3 = rollMysteryBonus(undefined, () => 0.6);
      const b4 = rollMysteryBonus(undefined, () => 0.9);

      expect(['advance_1', 'advance_2', 'shield', 'cleanse']).toContain(b1);
      expect(['advance_1', 'advance_2', 'shield', 'cleanse']).toContain(b2);
      expect(['advance_1', 'advance_2', 'shield', 'cleanse']).toContain(b3);
      expect(['advance_1', 'advance_2', 'shield', 'cleanse']).toContain(b4);
    });

    it('bot AI policy uses cleanse star on high impact penalties', () => {
      expect(decideBotCleanseUsage('reset_start', 5)).toBe(true);
      expect(decideBotCleanseUsage('retreat_2', 15)).toBe(true);
      expect(decideBotCleanseUsage('retreat_1', 8)).toBe(false);
      expect(decideBotCleanseUsage('retreat_1', 25)).toBe(true);
    });
  });
});
