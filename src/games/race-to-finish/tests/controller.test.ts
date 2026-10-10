import { RaceController } from '../state/RaceController';
import { PRNG } from '../../../shared/math/prng';
import { Player } from '../types/index';

const player = (id: string, bot = true): Player => ({ id, name: id, character: id === 'p1' ? 'fox' : 'penguin',
  isBot: bot, currentTileId: 'tile_0', pathHistory: ['tile_0'], position: 0, hasShield: false,
  cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1', rank: null });
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('controller rolls once, waits for human math, freezes timers on pause and resumes remaining delay', () => {
  const controller = new RaceController(() => 0.3); controller.connect(); controller.startGame('single', [player('p1', false), player('p2')]);
  controller.roll(); controller.roll(); expect(jest.getTimerCount()).toBe(1);
  jest.advanceTimersByTime(300); controller.send({ type: 'PAUSE', paused: true });
  jest.advanceTimersByTime(5000); expect(controller.getSnapshot().gamePhase).toBe('rolling');
  controller.send({ type: 'PAUSE', paused: false }); jest.advanceTimersByTime(449);
  expect(controller.getSnapshot().gamePhase).toBe('rolling'); jest.advanceTimersByTime(1);
  expect(controller.getSnapshot().gamePhase).toBe('showing_question');
  jest.advanceTimersByTime(10000); expect(controller.getSnapshot().players[0].position).toBe(0);
  controller.disconnect(); expect(jest.getTimerCount()).toBe(0);
});
test('bots follow complete turn phases to finish with exactly 4/5 correct per completed per-bot cycle', () => {
  const rng = new PRNG(318); const controller = new RaceController(() => rng.next()); controller.connect();
  controller.startGame('single', [player('p1'), player('p2')]);
  const answers: Record<string, boolean[]> = { p1: [], p2: [] }; const recorded = new Set<number>();
  const phases = new Set<string>();
  for (let step = 0; step < 1000; step++) {
    const s = controller.getSnapshot(); phases.add(s.gamePhase);
    if (s.gamePhase === 'evaluating_answer' && !recorded.has(s.actionId)) {
      recorded.add(s.actionId); answers[s.players[s.activePlayerIndex].id].push(s.answerCorrect!);
    }
    if (s.gamePhase === 'finished') break;
    if (s.motion && ['moving', 'applying_effect'].includes(s.gamePhase)) controller.send({ type: 'MOTION_DONE', id: s.actionId });
    else if (s.gamePhase === 'rolling_mystery') controller.send({ type: 'SPIN_DONE', id: s.actionId });
    else { expect(jest.getTimerCount()).toBe(1); jest.runOnlyPendingTimers(); }
  }
  expect(controller.getSnapshot().gamePhase).toBe('finished'); expect(controller.getSnapshot().winner?.position).toBe(49);
  for (const outcomes of Object.values(answers)) {
    expect(outcomes.length).toBeGreaterThanOrEqual(5);
    for (let i = 0; i + 5 <= outcomes.length; i += 5) expect(outcomes.slice(i, i + 5).filter(Boolean)).toHaveLength(4);
  }
  for (const phase of ['rolling', 'showing_question', 'evaluating_answer', 'moving', 'awaiting_fork_choice', 'rolling_mystery', 'mystery_result', 'turn_end']) expect(phases.has(phase)).toBe(true);
  expect(jest.getTimerCount()).toBe(0); controller.disconnect();
});
test('disconnect and restart invalidate pending bot actions', () => {
  const controller = new RaceController(() => 0.5); controller.connect(); controller.startGame('single', [player('p1'), player('p2')]);
  controller.disconnect(); jest.advanceTimersByTime(20000); expect(controller.getSnapshot().gamePhase).toBe('ready_to_roll');
  controller.connect(); jest.advanceTimersByTime(850); expect(controller.getSnapshot().gamePhase).toBe('rolling');
  controller.startGame('single', [player('p1', false), player('p2')]);
  jest.advanceTimersByTime(20000); expect(controller.getSnapshot().gamePhase).toBe('ready_to_roll'); expect(controller.getSnapshot().players[0].position).toBe(0);
  controller.disconnect();
});
test('callbacks from an old UI render cannot answer or roll in a later turn', () => {
  const controller = new RaceController(() => 0.3); controller.connect();
  controller.startGame('single', [player('p1', false), player('p2')]);
  const oldId = controller.getSnapshot().actionId;
  controller.roll(oldId); jest.advanceTimersByTime(750);
  const question = controller.getSnapshot();
  controller.answer('9999', oldId); expect(controller.getSnapshot()).toBe(question);
  controller.startGame('single', [player('p1', false), player('p2')]);
  const fresh = controller.getSnapshot(); controller.roll(oldId); expect(controller.getSnapshot()).toBe(fresh);
  controller.disconnect();
});
