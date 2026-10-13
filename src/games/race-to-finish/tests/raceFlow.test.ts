import { initialRaceState, RaceState, RaceEvent, raceReducer } from '../state/raceReducer';
import { Player, BonusEffectType, PenaltyEffectType } from '../types/index';
import { QuestionGenerator, answerText } from '../logic/questions';
import { PRNG } from '../../../shared/math/prng';
import { BOARD_TILES, getTile, getTileOrder, SHORTCUTS } from '../data/boardConfig';
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
  event({ type: 'ANSWER_FEEDBACK_DISMISSED' });
}
function completeMotion() {
  for (let i = 0; i < 20 && (s.motion ||
      s.gamePhase === 'shortcut_pause' ||
      (s.gamePhase === 'evaluating_tile' && getTile(s.players[s.activePlayerIndex].currentTileId).type === 'fork')); i++) {
    if (s.gamePhase === 'evaluating_tile') event({ type: 'LAND' });
    else if (s.gamePhase === 'shortcut_pause') event({ type: 'SHORTCUT_READY' });
    else event({ type: 'MOTION_DONE' });
  }
  if (s.gamePhase === 'evaluating_tile' && !s.diceLanding &&
      !['bonus', 'penalty'].includes(getTile(s.players[s.activePlayerIndex].currentTileId).type)) event({ type: 'LAND' });
}
function at(tile: number | string, flags: Partial<Player> = {}) {
  const tileId = typeof tile === 'number' ? `tile_${tile}` : tile;
  s = { ...s, players: [{ ...s.players[0], currentTileId: tileId, position: getTileOrder(tileId),
    pathHistory: Object.values(BOARD_TILES).sort((a, b) => a.order - b.order).slice(0, getTileOrder(tileId) + 1).map(t => t.id), ...flags }, s.players[1]] };
}
function mystery(tile: number | string, result: BonusEffectType | PenaltyEffectType, flags: Partial<Player> = {}) {
  at(tile, flags); s = { ...s, gamePhase: 'evaluating_tile', effectChain: null }; event({ type: 'LAND', result }); event({ type: 'SPIN_DONE' });
}
beforeEach(() => { s = raceReducer(initialRaceState, { type: 'START', mode: 'single', players: [player(), player('p2')] }); });

test('dice and question cannot move a token; correct answer unlocks precisely N steps', () => {
  startQuestion(3);
  expect(s.players[0].currentTileId).toBe('tile_0');
  event({ type: 'MOTION_DONE' }); event({ type: 'ANSWER_FEEDBACK_DONE' });
  expect(s.players[0].currentTileId).toBe('tile_0');
  event({ type: 'ANSWER', answer: answerText(s.question!) });
  expect(s.players[0].currentTileId).toBe('tile_0');
  event({ type: 'ANSWER_FEEDBACK_DONE' });
  expect(s.gamePhase).toBe('closing_answer'); expect(s.players[0].currentTileId).toBe('tile_0'); expect(s.motion).toBeNull();
  event({ type: 'ANSWER_FEEDBACK_DISMISSED' }); completeMotion();
  expect(s.players[0].currentTileId).toBe('tile_3');
  expect(s.players[0].pathHistory).toEqual(['tile_0', 'tile_1', 'tile_2', 'tile_3']);
  expect(s.gamePhase).toBe('evaluating_tile');
});
test('wrong answer stays in place and ends the turn', () => {
  at(12); startQuestion(6); event({ type: 'ANSWER', answer: 'not an answer' });
  expect(s.answerCorrect).toBe(false); const feedback = s;
  event({ type: 'ANSWER_FEEDBACK_DONE' }); expect(s).toBe(feedback);
  event({ type: 'ACKNOWLEDGE_ANSWER' });
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
  event({ type: 'ANSWER_FEEDBACK_DONE' }); event({ type: 'ANSWER_FEEDBACK_DISMISSED' }); const firstMove = s;
  s = raceReducer(s, { type: 'MOTION_DONE', id: answerId }); expect(s).toBe(firstMove);
});
test('many handovers do not reset either token', () => {
  for (let turn = 0; turn < 12; turn++) {
    const active = s.activePlayerIndex;
    const previous = s.players.map(p => [...p.pathHistory]);
    correctMove(1); completeMotion(); event({ type: 'LAND', result: getTile(s.players[s.activePlayerIndex].currentTileId).type === 'penalty' ? 'skip_turn' : 'shield' });
    if (s.gamePhase === 'rolling_mystery') { event({ type: 'SPIN_DONE' }); event({ type: 'APPLY' }); }
    event({ type: 'NEXT' });
    expect(s.players[active].pathHistory.slice(0, previous[active].length)).toEqual(previous[active]);
    expect(s.players[active].pathHistory.length).toBeGreaterThan(previous[active].length);
    expect(s.players[1 - active].pathHistory).toEqual(previous[1 - active]);
  }
});
test.each(SHORTCUTS)('$id: exact dice landing automatically traverses only after the final arrival animation', shortcut => {
  const before = Object.values(BOARD_TILES).find(tile => tile.nextTileIds.main === shortcut.forkTileId)!;
  at(before.id); correctMove(1);
  expect(s.players[0].currentTileId).toBe(shortcut.forkTileId);
  expect(s.gamePhase).toBe('moving');
  expect(s.diceLanding).toBeNull();
  const arrivalId = s.actionId;
  event({ type: 'MOTION_DONE' });
  expect(s.gamePhase).toBe('evaluating_tile');
  expect(s.diceLanding?.tileId).toBe(shortcut.forkTileId);
  event({ type: 'LAND' });
  expect(s.gamePhase).toBe('shortcut_pause');
  expect(s.players[0].currentTileId).toBe(shortcut.forkTileId);
  expect(s.players[0].currentPose).toBe('idle_1');
  expect(s.motion).toBeNull(); expect(s.diceLanding).toBeNull();
  event({ type: 'SHORTCUT_READY' });
  expect(s.gamePhase).toBe('applying_effect');
  expect(s.motion).toEqual({ kind: 'shortcut', remaining: 0, cause: 'shortcut' });
  expect(s.diceLanding).toBeNull(); expect(s.winner).toBeNull();
  expect(s.activePlayerIndex).toBe(0);
  const travelling = s;
  event({ type: 'LAND' }); expect(s).toBe(travelling);
  s = raceReducer(s, { type: 'MOTION_DONE', id: arrivalId }); expect(s).toBe(travelling);
  completeMotion();
  expect(s.players[0].currentTileId).toBe(shortcut.mergeTileId);
  expect(s.players[0].position).toBe(getTileOrder(shortcut.mergeTileId));
  expect(s.players[0].pathHistory.slice(-2)).toEqual([shortcut.forkTileId, shortcut.mergeTileId]);
  expect(s.gamePhase).toBe('turn_end');
});
test.each(SHORTCUTS)('$id: passing entry with dice 2..6 always follows main route', shortcut => {
  const before = Object.values(BOARD_TILES).find(tile => tile.nextTileIds.main === shortcut.forkTileId)!;
  for (let dice = 2; dice <= 6; dice++) {
    s = { ...s, gamePhase: 'ready_to_roll' }; at(before.id); correctMove(dice);
    while (s.motion) {
      expect(s.motion.kind).toBe('forward'); expect(s.diceLanding).toBeNull();
      const moving = s; event({ type: 'LAND' }); expect(s).toBe(moving);
      event({ type: 'MOTION_DONE' });
    }
    expect(s.gamePhase).toBe('evaluating_tile');
    expect(s.players[0].position).toBe(before.order + dice);
    expect(s.players[0].pathHistory).toContain(shortcut.mainNextId);
  }
});
test.each(SHORTCUTS)('$id: starting on entry from an effect follows main on the next roll', shortcut => {
  at(shortcut.forkTileId); correctMove(1); completeMotion();
  expect(s.players[0].currentTileId).toBe(shortcut.mainNextId);
  expect(s.gamePhase).toBe('evaluating_tile');
});
test.each(SHORTCUTS)('$id: wrong answer or timeout with exact-entry dice stays put', shortcut => {
  const before = Object.values(BOARD_TILES).find(tile => tile.nextTileIds.main === shortcut.forkTileId)!;
  for (const failure of ['incorrect', 'timeout']) {
    s = { ...s, gamePhase: 'ready_to_roll' }; at(before.id); startQuestion(1);
    if (failure === 'timeout') event({ type: 'QUESTION_TIMEOUT' });
    else event({ type: 'ANSWER', answer: 'wrong' });
    expect(s.answerFailure).toBe(failure);
    event({ type: 'ACKNOWLEDGE_ANSWER' });
    expect(s.players[0].currentTileId).toBe(before.id);
    expect(s.motion).toBeNull(); expect(s.diceLanding).toBeNull();
    expect(s.gamePhase).toBe('turn_end');
  }
});
test.each(SHORTCUTS)('$id: retreat retraces the actual shortcut edge without reactivation', shortcut => {
  const before = Object.values(BOARD_TILES).find(tile => tile.nextTileIds.main === shortcut.forkTileId)!;
  at(before.id); correctMove(1); completeMotion();
  const visited = [...s.players[0].pathHistory];
  for (const steps of [1, 2]) {
    // Force a penalty result after the traversed route, preserving its real history.
    mystery(5, steps === 1 ? 'retreat_1' : 'retreat_2');
    at(shortcut.mergeTileId, { pathHistory: visited });
    event({ type: 'APPLY' }); completeMotion();
    expect(s.players[0].currentTileId).toBe(steps === 1 ? shortcut.forkTileId : before.id);
    expect(s.players[0].pathHistory).toEqual(visited.slice(0, -steps));
    expect(s.gamePhase).toBe(steps === 2 && getTile(before.id).type === 'penalty' ? 'evaluating_tile' : 'turn_end');
    expect(s.diceLanding).toBeNull();
  }
});
test('pause rejects gameplay without changing logical position; resume preserves the same motion', () => {
  correctMove(2); const moving = s;
  s = raceReducer(s, { type: 'PAUSE', paused: true }); event({ type: 'MOTION_DONE' });
  expect(s.players).toBe(moving.players); expect(s.actionId).toBe(moving.actionId);
  s = raceReducer(s, { type: 'PAUSE', paused: false }); completeMotion(); expect(s.players[0].position).toBe(2);
});
test.each(['advance_1', 'advance_2'] as const)('%s applied once and resolves the normal destination after animation', result => {
  mystery(1, result); const id = s.actionId; event({ type: 'APPLY' });
  s = raceReducer(s, { type: 'APPLY', id }); completeMotion();
  expect(s.players[0].position).toBe(result === 'advance_1' ? 2 : 3);
  expect(s.gamePhase).toBe('turn_end'); expect(s.mysteryRollState).toBeNull();
});
test('bonus reaching entry exactly or passing it cannot activate a dice-only shortcut', () => {
  mystery(14, 'advance_2'); event({ type: 'APPLY' });
  event({ type: 'MOTION_DONE' }); event({ type: 'MOTION_DONE' });
  expect(s.gamePhase).toBe('evaluating_tile'); expect(s.diceLanding).toBeNull(); event({ type: 'LAND' });
  expect(s.gamePhase).toBe('turn_end'); expect(s.players[0].currentTileId).toBe('tile_16');
  const landed = s; event({ type: 'LAND' }); expect(s).toBe(landed);
  expect(s).not.toHaveProperty('forkChoiceState');
  s = { ...s, gamePhase: 'ready_to_roll' };
  mystery(1, 'advance_2'); at(3); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].currentTileId).toBe('tile_4_bonus'); expect(s.gamePhase).toBe('evaluating_tile');
  event({ type: 'LAND', result: 'shield' }); expect(s.gamePhase).toBe('rolling_mystery');
  expect(s).not.toHaveProperty('forkChoiceState');
});
test.each(['retreat_1', 'retreat_2'] as const)('%s backtracks visited route after shortcut', result => {
  mystery(15, result, { pathHistory: ['tile_0', 'tile_4', 'tile_8_mid', 'tile_9', 'tile_10', 'tile_11', 'tile_12', 'tile_13', 'tile_14', 'tile_15'] }); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].currentTileId).toBe(result === 'retreat_1' ? 'tile_14' : 'tile_13');
  expect(s.gamePhase).toBe(result === 'retreat_1' ? 'evaluating_tile' : 'turn_end');
});
test('retreat to an entrance does not activate a forward shortcut or chain another effect', () => {
  mystery(5, 'retreat_2'); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].currentTileId).toBe('tile_4');
  expect(s.gamePhase).toBe('turn_end'); expect(s).not.toHaveProperty('forkChoiceState');
});
test('pause at exact entry and duplicate completions cannot traverse twice or switch turn early', () => {
  correctMove(4); for (let i = 0; i < 4; i++) event({ type: 'MOTION_DONE' });
  s = raceReducer(s, { type: 'PAUSE', paused: true }); const paused = s;
  event({ type: 'LAND' }); expect(s).toBe(paused);
  s = raceReducer(s, { type: 'PAUSE', paused: false }); const id = s.actionId;
  event({ type: 'LAND' });
  expect(s.gamePhase).toBe('shortcut_pause');
  const entry = s; event({ type: 'MOTION_DONE' }); expect(s).toBe(entry);
  event({ type: 'SHORTCUT_READY' }); const travelling = s;
  s = raceReducer(s, { type: 'LAND', id }); expect(s).toBe(travelling);
  event({ type: 'LAND' }); event({ type: 'NEXT' }); expect(s).toBe(travelling);
  s = raceReducer(s, { type: 'PAUSE', paused: true }); const frozen = s;
  event({ type: 'MOTION_DONE' }); expect(s).toBe(frozen);
  s = raceReducer(s, { type: 'PAUSE', paused: false }); const completionId = s.actionId;
  event({ type: 'MOTION_DONE' }); const done = s;
  s = raceReducer(s, { type: 'MOTION_DONE', id: completionId }); expect(s).toBe(done);
  expect(s.players[0].currentTileId).toBe('tile_8_mid'); expect(s.gamePhase).toBe('turn_end');
  expect(s.players[0].pathHistory.filter(id => id === 'tile_8_mid')).toHaveLength(1);
});

test.each(SHORTCUTS)('$id: entry position or stale landing alone cannot open a shortcut', shortcut => {
  at(shortcut.forkTileId);
  s = { ...s, gamePhase: 'evaluating_tile', answerCorrect: true };
  event({ type: 'LAND' });
  expect(s.gamePhase).toBe('turn_end'); expect(s).not.toHaveProperty('forkChoiceState');
  for (const landing of [
    { tileId: shortcut.mainNextId, playerIndex: 0, turnId: s.turnId },
    { tileId: shortcut.forkTileId, playerIndex: 1, turnId: s.turnId },
    { tileId: shortcut.forkTileId, playerIndex: 0, turnId: s.turnId - 1 },
  ]) {
    s = { ...s, gamePhase: 'evaluating_tile', diceLanding: landing };
    event({ type: 'LAND' });
    expect(s.gamePhase).toBe('turn_end'); expect(s).not.toHaveProperty('forkChoiceState');
  }
});

test.each(SHORTCUTS)('$id: reward/penalty steps cannot activate or preserve a landing, even at the entry', shortcut => {
  const route = Object.values(BOARD_TILES).sort((a, b) => a.order - b.order);
  const forkOrder = getTileOrder(shortcut.forkTileId);
  for (const [result, startOrder] of [
    ['advance_1', forkOrder - 1], ['advance_2', forkOrder - 1],
    ['retreat_1', forkOrder + 1], ['retreat_2', forkOrder + 1],
  ] as const) {
    mystery(result.startsWith('advance') ? 1 : 5, result);
    at(route[startOrder].id);
    event({ type: 'APPLY' });
    let visitedEntry = false;
    while (s.motion) {
      if (s.players[0].currentTileId === shortcut.forkTileId) visitedEntry = true;
      const moving = s; event({ type: 'LAND' }); expect(s).toBe(moving); expect(s.diceLanding).toBeNull();
      event({ type: 'MOTION_DONE' });
    }
    expect(visitedEntry).toBe(true); expect(s.gamePhase).toBe('evaluating_tile');
    event({ type: 'LAND', result: 'shield' }); expect(s.gamePhase).not.toBe('shortcut_pause');
    expect(s).not.toHaveProperty('forkChoiceState'); expect(s.diceLanding).toBeNull();
  }
});

test('swapped bonus resolves at tile_28; former bonus tile_29 now resolves as normal', () => {
  at(27); correctMove(1); completeMotion(); event({ type: 'LAND', result: 'shield' });
  expect(s.gamePhase).toBe('rolling_mystery'); expect(s.mysteryRollState?.tileId).toBe('tile_28');
  s = { ...s, gamePhase: 'ready_to_roll' }; at(28); correctMove(1); completeMotion(); event({ type: 'LAND' });
  expect(s.players[0].currentTileId).toBe('tile_29'); expect(s.gamePhase).toBe('turn_end');
  expect(s.mysteryRollState).toBeNull();
});
test('shield blocks and is consumed once; cleanse can be saved or consumed', () => {
  mystery(15, 'retreat_2', { hasShield: true, cleanseCount: 1 }); event({ type: 'APPLY' });
  expect(s.players[0].hasShield).toBe(false); expect(s.players[0].cleanseCount).toBe(1); expect(s.players[0].currentTileId).toBe('tile_15');
  mystery(15, 'retreat_2', { cleanseCount: 1 }); event({ type: 'APPLY', cleanse: true });
  expect(s.players[0].cleanseCount).toBe(0); expect(s.players[0].currentTileId).toBe('tile_15');
  mystery(15, 'retreat_1', { cleanseCount: 1 }); event({ type: 'APPLY' }); completeMotion();
  expect(s.players[0].cleanseCount).toBe(1); expect(s.players[0].currentTileId).toBe('tile_14');
});
test.each(['shield', 'cleanse'] as const)('inventory %s capped at one', result => {
  mystery('tile_4_bonus', result, { hasShield: true, cleanseCount: 1 }); event({ type: 'APPLY' });
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
  at(47); correctMove(6); expect(s.gamePhase).toBe('moving'); expect(s.winner).toBeNull();
  event({ type: 'MOTION_DONE' }); expect(s.gamePhase).toBe('finished'); expect(s.winner?.currentTileId).toBe('tile_49');
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
