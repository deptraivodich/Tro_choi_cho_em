import { ProfileManager } from '../storage/profileManager';
import { defaultStorage } from '../storage/localStorageAdapter';
import { GAME_REGISTRY, GAME_LIST } from '../../games/registry';
import { GameId } from '../types/index';
import {
  generateEnergyDefenseProblem,
  generatePlanetRescueRooms,
  generateRacingStages,
  generateVaultCode,
} from '../math/generators';

describe('Storage & Game Integration Tests', () => {
  let profileMgr: ProfileManager;

  beforeEach(() => {
    profileMgr = new ProfileManager(defaultStorage);
  });

  test('Registry contains exactly 10 games with distinct IDs and components', () => {
    expect(GAME_LIST.length).toBe(10);
    const expectedIds: GameId[] = [
      'energy-defense',
      'planet-rescue',
      'terrain-racing',
      'race-to-finish',
      'block-island',
      'vault-code',
      'floating-market',
      'rhythm-bakery',
      'treasure-dive',
      'royal-artillery',
    ];

    expectedIds.forEach((id) => {
      expect(GAME_REGISTRY[id]).toBeDefined();
      expect(GAME_REGISTRY[id].metadata.id).toBe(id);
      expect(GAME_REGISTRY[id].component).toBeDefined();
    });
  });

  test('Energy defense generator generates solvable problems', () => {
    const easy = generateEnergyDefenseProblem('easy');
    expect(easy.availablePieces.length).toBeGreaterThan(0);
    expect(easy.targetFraction.den).toBeGreaterThan(0);

    const med = generateEnergyDefenseProblem('medium');
    expect(med.availablePieces.length).toBeGreaterThan(0);
  });

  test('Planet rescue generator creates 5 rooms', () => {
    const rooms = generatePlanetRescueRooms();
    expect(rooms.length).toBe(5);
    rooms.forEach((r) => {
      expect(r.shieldFraction.den).toBeGreaterThan(0);
      expect(r.simplifiedShield.den).toBeGreaterThan(0);
    });
  });

  test('Terrain racing generator creates 10 progressive stages', () => {
    const stages = generateRacingStages();
    expect(stages.length).toBe(10);
    stages.forEach((st) => {
      expect(st.targetVelocity).toBeGreaterThan(0);
      expect(st.options).toContain(st.correctAnswer);
    });
  });

  test('Vault code generator produces stable code for the same daily seed', () => {
    const codeA = generateVaultCode('2026-10-04-1');
    const codeB = generateVaultCode('2026-10-04-1');
    expect(codeA.code).toBe(codeB.code);
    expect(codeA.hints.length).toBeGreaterThan(0);
  });

  test('Profile manager saves and loads local sessions with schemaVersion', async () => {
    const profile = await profileMgr.getOrCreateProfile();
    expect(profile.profileId).toBe('local-learner-sandbox-01');

    await profileMgr.saveSessionResult({
      sessionId: 'test-session-1',
      gameId: 'energy-defense',
      profileId: profile.profileId,
      difficulty: 'easy',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      actualPlaytimeSeconds: 120,
      isWon: true,
      score: 100,
      maxScore: 100,
      correctCount: 5,
      incorrectCount: 0,
      skillsPracticed: ['Cộng phân số'],
      schemaVersion: 1,
    });

    const history = await profileMgr.getSessionHistory(profile.profileId);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].sessionId).toBe('test-session-1');
    expect(history[0].schemaVersion).toBe(1);
  });

  test('Daily quota persists and does not reset on reload', async () => {
    const profile = await profileMgr.getOrCreateProfile();
    const dateStr = '2026-10-04';

    await profileMgr.updateDailyQuota(profile.profileId, dateStr, (prev) => ({
      ...prev,
      vaultCodeCompleted: 2,
    }));

    const quota = await profileMgr.getDailyQuota(profile.profileId, dateStr);
    expect(quota.vaultCodeCompleted).toBe(2);
  });
});
