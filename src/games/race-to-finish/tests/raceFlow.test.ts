import { initialRaceState, RaceState, RaceEvent, raceReducer } from '../state/raceReducer';
import { Player, BonusEffectType, PenaltyEffectType } from '../types/index';
import { QuestionGenerator, answerText } from '../logic/questions';
import { PRNG } from '../../../shared/math/prng';
import { getTile } from '../data/boardConfig';
import { rollMysteryPenalty, DEFAULT_PENALTY_POOL } from '../logic/gameEngine';
import { tokenPlacements } from '../logic/tokenPlacement';
import { reelPlan, REEL_STRIDE } from '../logic/reelPlan';

export const player = (id = 'p1', bot = false): Player => ({ id, name: id, character: id === 'p1' ? 'fox' : 'penguin',
  isBot: bot, currentTileId: 'tile_0', pathHistory: ['tile_0'], position: 0, hasShield: false,
  cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1', rank: null });
let s: RaceState;
const random = new PRNG(123);
const generator = new QuestionGenerator(() => random.next());
function event(e: Omit<Extract<RaceEvent, { id: number }>, 'id'> & Record<string, unknown>) {
  s = raceReducer(s, { ...e, id: s.actionId } as RaceEvent);
}
function startQuestion(dice = 2) {
  event({ type: 'ROLL', value: dice });
  event({ type: 'DICE_DONE', question: generator.next(s.players[0].currentTileId) });
}
function correctMove(dice = 2) {
  startQuestion(dice); event({ type: 'ANSWER', answer: answerText(s.question!) }); event({ type: 'ANSWER_FEEDBACK_DONE' });
}
function completeMotion(choice: 'main' | 'shortcut' = 'main') {
  for (let i = 0; i < 20 && (s.motion || s.gamePhase === 'awaiting_fork_choice'); i++) {
    if (s.gamePhase === 'awaiting_fork_choice') event({ type: 'BRANCH', choice });
    else event({ type: 'MOTION_DONE' });
  }
}
function at(tile: number, flags: Partial<Player> = {}) {
  s = { ...s, players: [{ ...s.players[0], currentTileId: `tile_${tile}`, position: tile,
    pathHistory: Array.from({ length: tile + 1 }, (_, i) => `tile_${i}`), ...flags }, s.players[1]] };
}
function mystery(tile: number, result: BonusEffectType | PenaltyEffectType, flags: Partial<Player> = {}) {
  at(tile, flags); s = { ...s, gamePhase: 'evaluating_tile' }; event({ type: 'LAND', result }); event({ type: 'SPIN_DONE' });
}
beforeEach(() => { s = raceReducer(initialRaceState, { type: 'START', mode: 'single', players: [player(), player('p2')] }); });

test('dice and question cannot move a token; correct answer unlocks precisely N steps', () => {
  startQuestion(3);
  expect(s.players[0].currentTileId).toBe('tile_0');
  event({ type: 'MOTION_DONE' }); event({ type: 'ANSWER_FEEDBACK_DONE' });
  expect(s.players[0].currentTileId).toBe('tile_0');
  event({ type: 'ANSWER', answer: answerText(s.question!) });
  expect(s.players[0].currentTileId).toBe('tile_0');
  event({ type: 'ANSWER_FEEDBACK_DONE' }); completeMotion();
  expect(s.players[0].currentTileId).toBe('tile_3');
  expect(s.players[0].pathHistory).toEqual(['tile_0', 'tile_1', 'tile_2', 'tile_3']);
  expect(s.gamePhase).toBe('evaluating_tile');
});
test('wrong answer stays in place and ends the turn', () => {
  at(12); startQuestion(6); event({ type: 'ANSWER', answer: 'not an answer' });
  expect(s.answerCorrect).toBe(false); event({ type: 'ANSWER_FEEDBACK_DONE' });
  expect(s.players[0].currentTileId).toBe('tile_12'); expect(s.gamePhase).toBe('turn_end');
  event({ type: 'NEXT' }); expect(s.activePlayerIndex).toBe(1);
});
test('rapid rolls, answers, and stale completions are rejected', () => {
  const id = s.actionId; event({ type: 'ROLL', value: 4 }); const rolling = s;
  s = raceReducer(s, { type: 'ROLL', id, value: 6 }); expect(s).toBe(rolling);
  event({ type: 'ROLL', value: 6 }); expect(s).toBe(rolling);
  event({ type: 'DICE_DONE', question: generator.next('tile_0') });
  const answerId = s.actionId; event({ type: 'ANSWER', answer: answerText(s.question!) });
  const answered = s; s = raceReducer(s, { type: 'ANSWER', id: answerId, answer: 'wrong' }); expect(s).toBe(answered);
  event({ type: 'ANSWER_FEEDBACK_DONE' }); const firstMove = s;
  s = raceReducer(s, { type: 'MOTION_DONE', id: answerId }); expect(s).toBe(firstMove);
});
test('many handovers do not reset either token', () => {
  for (let turn = 0; turn < 12; turn++) {
    correctMove(1); completeMotion(); event({ type: 'LAND', result: getTile(s.players[s.activePlayerIndex].currentTileId).type === 'penalty' ? 'skip_turn' : 'shield' });
    if (s.gamePhase === 'rolling_mystery') { event({ type: 'SPIN_DONE' }); event({ type: 'APPLY' }); }
    event({ type: 'NEXT' });
    expect(s.players[0].position).toBe(Math.ceil((turn + 1) / 2));
    expect(s.players[1].position).toBe(Math.floor((turn + 1) / 2));
  }
});
test('fork choice happens after reaching fork and after a stationary fork roll', () => {
  correctMove(6); for (let i = 0; i < 4; i++) event({ type: 'MOTION_DONE' });
  expect(s.gamePhase).toBe('awaiting_fork_choice'); expect(s.players[0].currentTileId).toBe('tile_4');
  event({ type: 'BRANCH', choice: 'shortcut' }); completeMotion(); expect(s.players[0].currentTileId).toBe('tile_12');
  expect(s.players[0].pathHistory).toEqual(['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_11', 'tile_12']);
  s = { ...s, gamePhase: 'ready_to_roll' }; at(16); correctMove(1);
  expect(s.gamePhase).toBe('awaiting_fork_choice'); event({ type: 'BRANCH', choice: 'shortcut' }); completeMotion();
  expect(s.players[0].currentTileId).toBe('tile_30');
});
test('pause rejects gameplay without changing logical position; resume preserves the same motion', () => {
  correctMove(2); const moving = s;
  s = raceReducer(s, { type: 'PAUSE', paused: true }); event({ type: 'MOTION_DONE' });
  expect(s.players).toBe(moving.players); expect(s.actionId).toBe(moving.actionId);
  s = raceReducer(s, { type: 'PAUSE', paused: false }); completeMotion(); expect(s.players[0].position).toBe(2);
});
test.each(['advance_1', 'advance_2'] as const)('%s applied once and never chains destination effects', result => {
  mystery(1, result); const id = s.actionId; event({ type: 'APPLY' });
  s = raceReducer(s, { type: 'APPLY', id }); completeMotion();
  expect(s.players[0].position).toBe(result === 'advance_1' ? 2 : 3);
  expect(s.gamePhase).toBe('turn_end'); expect(s.mysteryRollState).toBeNull();
});
test('bonus landing at a fork preserves route selection for the next roll', () => {
  mystery(14, 'advance_2'); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].position).toBe(16); expect(s.gamePhase).toBe('turn_end');
  s = { ...s, gamePhase: 'ready_to_roll' }; correctMove(1);
  expect(s.gamePhase).toBe('awaiting_fork_choice'); event({ type: 'BRANCH', choice: 'shortcut' }); completeMotion();
  expect(s.players[0].position).toBe(30);
});
test.each(['retreat_1', 'retreat_2'] as const)('%s backtracks visited route after shortcut', result => {
  mystery(15, result, { pathHistory: ['tile_0', 'tile_4', 'tile_11', 'tile_12', 'tile_13', 'tile_14', 'tile_15'] }); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].position).toBe(result === 'retreat_1' ? 14 : 13); expect(s.gamePhase).toBe('turn_end');
});
test('shield blocks and is consumed once; cleanse can be saved or consumed', () => {
  mystery(15, 'retreat_2', { hasShield: true, cleanseCount: 1 }); event({ type: 'APPLY' });
  expect(s.players[0].hasShield).toBe(false); expect(s.players[0].cleanseCount).toBe(1); expect(s.players[0].position).toBe(15);
  mystery(15, 'retreat_2', { cleanseCount: 1 }); event({ type: 'APPLY', cleanse: true });
  expect(s.players[0].cleanseCount).toBe(0); expect(s.players[0].position).toBe(15);
  mystery(15, 'retreat_1', { cleanseCount: 1 }); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].cleanseCount).toBe(1); expect(s.players[0].position).toBe(14);
});
test.each(['shield', 'cleanse'] as const)('inventory %s capped at one', result => {
  mystery(3, result, { hasShield: true, cleanseCount: 1 }); event({ type: 'APPLY' });
  expect(s.players[0].hasShield).toBe(true); expect(s.players[0].cleanseCount).toBe(1);
});
test('skip flag clears precisely on next scheduled turn', () => {
  mystery(15, 'skip_turn'); event({ type: 'APPLY' }); event({ type: 'NEXT' });
  expect(s.players[0].skipNextTurn).toBe(true);
  s = { ...s, gamePhase: 'turn_end' }; event({ type: 'NEXT' });
  expect(s.gamePhase).toBe('turn_end'); expect(s.activePlayerIndex).toBe(0); expect(s.players[0].skipNextTurn).toBe(false);
  event({ type: 'NEXT' }); expect(s.activePlayerIndex).toBe(1); expect(s.gamePhase).toBe('ready_to_roll');
});
test('reset is permitted on early penalty and rejected from tile 11 onward', () => {
  mystery(5, 'reset_start'); event({ type: 'APPLY' }); completeMotion(); expect(s.players[0].position).toBe(0);
  at(15); s = { ...s, gamePhase: 'evaluating_tile' }; const before = s;
  event({ type: 'LAND', result: 'reset_start' }); expect(s).toBe(before);
});
test('only final animation completion declares winner and all further actions are blocked', () => {
  at(48); correctMove(6); expect(s.gamePhase).toBe('moving'); expect(s.winner).toBeNull();
  event({ type: 'MOTION_DONE' }); expect(s.gamePhase).toBe('finished'); expect(s.winner?.position).toBe(49);
  const finished = s; event({ type: 'ROLL', value: 1 }); event({ type: 'NEXT' }); expect(s).toBe(finished);
});
test('restart invalidates callbacks from previous session', () => {
  correctMove(3); const oldId = s.actionId; s = raceReducer(s, { type: 'START', mode: 'single', players: s.players });
  const fresh = s; s = raceReducer(s, { type: 'MOTION_DONE', id: oldId }); expect(s).toBe(fresh);
});
test('local multiplayer handover can only be confirmed in handover phase', () => {
  s = { ...s, gameMode: 'local_multiplayer', gamePhase: 'turn_end' }; event({ type: 'NEXT' });
  expect(s.gamePhase).toBe('turn_handover'); event({ type: 'HANDOVER' }); expect(s.gamePhase).toBe('ready_to_roll');
});
test.each([320, 390, 620, 1024])('same-tile sprites separated, bounded and recentered at width %i', width => {
  const all = [player(), player('p2'), { ...player('p3'), character: 'bunny' as const }, { ...player('p4'), character: 'turtle' as const }];
  for (const tileId of ['tile_0', 'tile_4', 'tile_16', 'tile_30', 'tile_49']) {
    const occupants = all.map(p => ({ ...p, currentTileId: tileId }));
    for (const count of [2, 3, 4]) {
      const placements = tokenPlacements(occupants.slice(0, count), width, width * 9 / 16);
      expect(new Set(Object.values(placements).map(p => `${p.x},${p.y}`)).size).toBe(count);
      for (const p of Object.values(placements)) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x + p.size).toBeLessThanOrEqual(width); expect(p.y + p.size).toBeLessThanOrEqual(width * 9 / 16); }
    }
    const pair = tokenPlacements(occupants.slice(0, 2), width, width * 9 / 16);
    const distance = Math.hypot(pair.p1.x - pair.p2.x, pair.p1.y - pair.p2.y);
    expect(distance).toBeGreaterThanOrEqual(pair.p1.size * 0.65);
    const solo = tokenPlacements(occupants.slice(0, 1), width, width * 9 / 16);
    expect(solo.p1.x === pair.p1.x && solo.p1.y === pair.p1.y).toBe(false);
    expect(occupants[0].currentTileId).toBe(tileId);
  }
});
test('reel final centered slot always equals locked game result and pool excludes late reset', () => {
  mystery(1, 'advance_2'); const bonus = reelPlan(s.mysteryRollState!);
  expect(bonus.slots[bonus.targetSlot]).toBe('advance_2'); expect(bonus.targetX).toBe(-bonus.targetSlot * REEL_STRIDE);
  mystery(15, 'skip_turn'); const penalty = reelPlan(s.mysteryRollState!);
  expect(penalty.slots).not.toContain('reset_start'); expect(penalty.slots[penalty.targetSlot]).toBe('skip_turn');
  expect(() => reelPlan({ ...s.mysteryRollState!, result: 'reset_start' })).toThrow();
});
test('late reset is purged even if a custom penalty configuration accidentally includes it', () => {
  const configuration = { firstTenTiles: DEFAULT_PENALTY_POOL.firstTenTiles, afterTenTiles: [
    { type: 'reset_start' as const, weight: 99 }, { type: 'retreat_1' as const, weight: 1 },
  ] };
  for (const value of [0, 0.2, 0.5, 0.999]) expect(rollMysteryPenalty('tile_15', configuration, () => value)).toBe('retreat_1');
});
