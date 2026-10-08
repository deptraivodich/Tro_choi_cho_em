import {
  calculateStepsFromDice,
  rollDice,
  evaluateLandingTile,
  applyPenaltyDirectly,
  decideBotCleanseUsage,
} from '../games/race-to-finish/gameEngine';
import { Player } from '../games/race-to-finish/types';
import { BOARD_TILES, getPlayerTileOffset, getTileNormalizedCoords } from '../games/race-to-finish/boardConfig';

describe('Đua Về Đích - Game Rules & Engine Tests', () => {
  const createMockPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: 'p1',
    name: 'Cáo',
    character: 'fox',
    isBot: false,
    position: 0,
    hasShield: false,
    cleanseCount: 0,
    skipNextTurn: false,
    currentPose: 'idle_1',
    rank: null,
    ...overrides,
  });

  describe('1. Dice Roll and Step Mapping', () => {
    it('maps odd rolls (1, 3, 5) to 1 step and even rolls (2, 4, 6) to 2 steps', () => {
      expect(calculateStepsFromDice(1)).toBe(1);
      expect(calculateStepsFromDice(2)).toBe(2);
      expect(calculateStepsFromDice(3)).toBe(1);
      expect(calculateStepsFromDice(4)).toBe(2);
      expect(calculateStepsFromDice(5)).toBe(1);
      expect(calculateStepsFromDice(6)).toBe(2);
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

  describe('2. Bonus Tiles (+1, +2, Shield, Cleanse Star)', () => {
    it('advances 1 extra step on tiles 2 and 17 without chaining destination', () => {
      const p = createMockPlayer({ position: 1 });
      const res2 = evaluateLandingTile(p, 0, 2);
      expect(res2.nextPosition).toBe(3); // 2 + 1 = 3
      expect(res2.effectType).toBe('bonus');

      const p16 = createMockPlayer({ position: 16 });
      const res17 = evaluateLandingTile(p16, 0, 17);
      expect(res17.nextPosition).toBe(18); // 17 + 1 = 18
      expect(res17.effectType).toBe('bonus');
    });

    it('advances 2 extra steps on tile 5', () => {
      const p = createMockPlayer({ position: 3 });
      const res = evaluateLandingTile(p, 0, 5);
      expect(res.nextPosition).toBe(7); // 5 + 2 = 7
      // Important: landing at 7 via bonus does NOT trigger portal on 7 (no chain trigger)
      expect(res.effectType).toBe('bonus');
    });

    it('awards Shield on tile 9 (capped at 1, no duplicate stacking)', () => {
      const pWithoutShield = createMockPlayer({ hasShield: false });
      const res1 = evaluateLandingTile(pWithoutShield, 0, 9);
      expect(res1.hasShield).toBe(true);
      expect(res1.effectType).toBe('item_received');

      const pWithShield = createMockPlayer({ hasShield: true });
      const res2 = evaluateLandingTile(pWithShield, 0, 9);
      expect(res2.hasShield).toBe(true);
      expect(res2.logMessage).toContain('không cộng dồn');
    });

    it('awards Cleanse Star on tile 13 (capped at 1, held to use)', () => {
      const pWithout = createMockPlayer({ cleanseCount: 0 });
      const res1 = evaluateLandingTile(pWithout, 0, 13);
      expect(res1.cleanseCount).toBe(1);
      expect(res1.effectType).toBe('item_received');

      const pWith = createMockPlayer({ cleanseCount: 1 });
      const res2 = evaluateLandingTile(pWith, 0, 13);
      expect(res2.cleanseCount).toBe(1);
      expect(res2.logMessage).toContain('không cộng dồn');
    });
  });

  describe('3. Penalty Tiles and Shield Defense', () => {
    it('retreats 1 step on tile 4 and 2 steps on tile 14 when unprotected', () => {
      const p = createMockPlayer({ hasShield: false, cleanseCount: 0 });
      const res4 = evaluateLandingTile(p, 0, 4);
      expect(res4.nextPosition).toBe(3); // 4 - 1 = 3
      expect(res4.effectType).toBe('penalty_applied');

      const res14 = evaluateLandingTile(p, 0, 14);
      expect(res14.nextPosition).toBe(12); // 14 - 2 = 12
      expect(res14.effectType).toBe('penalty_applied');
    });

    it('returns to start plank 0 on tile 7 when unprotected', () => {
      const p = createMockPlayer({ hasShield: false, cleanseCount: 0 });
      const res = evaluateLandingTile(p, 0, 7);
      expect(res.nextPosition).toBe(0);
      expect(res.effectType).toBe('penalty_applied');
    });

    it('skips next turn on tile 11 and tile 19', () => {
      const p = createMockPlayer({ hasShield: false, cleanseCount: 0, skipNextTurn: false });
      const res11 = evaluateLandingTile(p, 0, 11);
      expect(res11.skipNextTurn).toBe(true);

      const res19 = evaluateLandingTile(p, 0, 19);
      expect(res19.skipNextTurn).toBe(true);
    });

    it('Shield automatically blocks penalty and is consumed exactly once', () => {
      const p = createMockPlayer({ hasShield: true, cleanseCount: 0 });
      // Landing on portal tile 7
      const res = evaluateLandingTile(p, 0, 7);
      expect(res.nextPosition).toBe(7); // Did NOT get sent back to 0!
      expect(res.hasShield).toBe(false); // Shield consumed
      expect(res.consumedShield).toBe(true);
      expect(res.effectType).toBe('penalty_blocked');
    });
  });

  describe('4. Cleanse Star Decision (Human vs Bot)', () => {
    it('prompts human player with CleanseChoiceModal when holding Cleanse Star', () => {
      const human = createMockPlayer({ isBot: false, hasShield: false, cleanseCount: 1 });
      const res = evaluateLandingTile(human, 0, 7);
      expect(res.needsCleanseChoice).toBe(true);
      expect(res.pendingPenalty).toBeDefined();
      expect(res.pendingPenalty?.type).toBe('reset_start');
    });

    it('Bot AI automatically uses Cleanse Star for severe penalties (Tile 7 or 14)', () => {
      expect(decideBotCleanseUsage('reset_start', 7)).toBe(true);
      expect(decideBotCleanseUsage('retreat_2', 14)).toBe(true);

      const bot = createMockPlayer({ isBot: true, hasShield: false, cleanseCount: 1 });
      const res = evaluateLandingTile(bot, 0, 7);
      expect(res.needsCleanseChoice).toBe(false);
      expect(res.consumedCleanse).toBe(true);
      expect(res.cleanseCount).toBe(0);
      expect(res.nextPosition).toBe(7); // Blocked
    });

    it('applying penalty directly when player chooses to keep Cleanse Star', () => {
      const p = createMockPlayer({ cleanseCount: 1 });
      const res = applyPenaltyDirectly(p, 4, 'retreat_1');
      expect(res.nextPosition).toBe(3); // 4 - 1 = 3
      expect(res.cleanseCount).toBe(1); // Star preserved for later
    });
  });

  describe('5. Victory Conditions and Boundary Rules', () => {
    it('winning at or beyond tile 21 clamps to 21 and awards victory', () => {
      const p20 = createMockPlayer({ position: 20 });
      // Rolled even (2 steps): 20 + 2 = 22 -> clamped to 21
      const res = evaluateLandingTile(p20, 0, 22);
      expect(res.nextPosition).toBe(21);
      expect(res.effectType).toBe('win');
    });

    it('position never falls below 0', () => {
      const p1 = createMockPlayer({ position: 1 });
      const res = applyPenaltyDirectly(p1, 1, 'retreat_2');
      expect(res.nextPosition).toBe(0);
    });
  });

  describe('6. Board Layout and Player Offsets', () => {
    it('has all 21 tiles properly configured in 7 rows and 3 columns', () => {
      expect(Object.keys(BOARD_TILES).length).toBe(21);
      for (let i = 1; i <= 21; i++) {
        expect(BOARD_TILES[i].index).toBe(i);
        expect(BOARD_TILES[i].row).toBeGreaterThanOrEqual(0);
        expect(BOARD_TILES[i].row).toBeLessThanOrEqual(6);
        expect(BOARD_TILES[i].col).toBeGreaterThanOrEqual(0);
        expect(BOARD_TILES[i].col).toBeLessThanOrEqual(2);
      }
    });

    it('provides valid normalized coords for all tiles and start plank', () => {
      const startCoords = getTileNormalizedCoords(0);
      expect(startCoords.x).toBeGreaterThan(0);
      expect(startCoords.y).toBeGreaterThan(0);

      for (let i = 1; i <= 21; i++) {
        const c = getTileNormalizedCoords(i);
        expect(c.x).toBeGreaterThan(15);
        expect(c.x).toBeLessThan(85);
        expect(c.y).toBeGreaterThan(15);
        expect(c.y).toBeLessThan(70);
      }
    });

    it('distributes 1 to 4 players without overlap', () => {
      const off1 = getPlayerTileOffset(0, 1);
      expect(off1.offsetX).toBe(0);

      const off2_p0 = getPlayerTileOffset(0, 2);
      const off2_p1 = getPlayerTileOffset(1, 2);
      expect(off2_p0.offsetX).not.toEqual(off2_p1.offsetX);

      const off4_p0 = getPlayerTileOffset(0, 4);
      const off4_p1 = getPlayerTileOffset(1, 4);
      const off4_p2 = getPlayerTileOffset(2, 4);
      const off4_p3 = getPlayerTileOffset(3, 4);
      expect(new Set([off4_p0.offsetX, off4_p1.offsetX, off4_p2.offsetX, off4_p3.offsetX]).size).toBe(2);
    });
  });
});
