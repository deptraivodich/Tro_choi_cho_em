import { RaceController } from '../state/RaceController';
import { PRNG } from '../../../shared/math/prng';
import { Player } from '../types/index';
import { answerText } from '../logic/questions';
import { QUESTION_TIME_LIMIT_MS, MYSTERY_RESULT_DISPLAY_MS, CLEANSE_CHOICE_MS } from '../state/turnTiming';

const player = (id: string, bot = true): Player => ({ id, name: id, character: id === 'p1' ? 'fox' : 'penguin',
  isBot: bot, currentTileId: 'tile_0', pathHistory: ['tile_0'], position: 0, hasShield: false,
  cleanseCount: 0, skipNextTurn: false, currentPose: 'idle_1', rank: null });
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('controller rolls once, waits for human math, freezes timers on pause and resumes remaining delay', () => {
  const controller = new RaceController(() => 0.3); controller.connect(); controller.startGame('single', [player('p1', false), player('p2')]);
  controller.roll(); controller.roll(); expect(jest.getTimerCount()).toBe(1);
  jest.advanceTimersByTime(300); controller.send({ type: 'PAUSE', paused: true });
  expect(controller.getDiceTimeRemaining()).toBe(450);
  const playtime = controller.getActivePlaytime();
  jest.advanceTimersByTime(5000); expect(controller.getSnapshot().gamePhase).toBe('rolling');
  expect(controller.getActivePlaytime()).toBe(playtime);
  expect(controller.getDiceTimeRemaining()).toBe(450);
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
    else if (s.gamePhase === 'closing_answer') controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: s.actionId });
    else { expect(jest.getTimerCount()).toBe(1); jest.runOnlyPendingTimers(); }
  }
  expect(controller.getSnapshot().gamePhase).toBe('finished'); expect(controller.getSnapshot().winner?.currentTileId).toBe('tile_49');
  for (const outcomes of Object.values(answers)) {
    expect(outcomes.length).toBeGreaterThanOrEqual(5);
    for (let i = 0; i + 5 <= outcomes.length; i += 5) expect(outcomes.slice(i, i + 5).filter(Boolean)).toHaveLength(4);
  }
  // Passing a fork must not create a choice; this seeded full game need not land at one.
  for (const phase of ['rolling', 'showing_question', 'evaluating_answer', 'moving', 'rolling_mystery', 'mystery_result', 'turn_end']) expect(phases.has(phase)).toBe(true);
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

test('bot automatically traverses an exact entry, pauses motion, and waits for animation before ending turn', () => {
  const controller = new RaceController(() => 0.55); controller.connect();
  controller.startGame('single', [player('p1'), player('p2')]);
  jest.advanceTimersByTime(4100); // 4 on the dice; the first bot answer is correct.
  expect(controller.getSnapshot().gamePhase).toBe('closing_answer');
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: controller.getSnapshot().actionId });
  expect(controller.getSnapshot().gamePhase).toBe('moving');
  for (let i = 0; i < 4; i++) controller.send({ type: 'MOTION_DONE', id: controller.getSnapshot().actionId });
  expect(controller.getSnapshot().gamePhase).toBe('evaluating_tile');
  jest.advanceTimersByTime(0);
  expect(controller.getSnapshot().gamePhase).toBe('applying_effect');
  expect(controller.getSnapshot().motion?.kind).toBe('shortcut');
  expect(controller.getSnapshot().players[0].currentTileId).toBe('tile_8_mid');
  expect(jest.getTimerCount()).toBe(0);
  controller.send({ type: 'PAUSE', paused: true });
  const paused = controller.getSnapshot(); jest.advanceTimersByTime(5000);
  controller.send({ type: 'MOTION_DONE', id: paused.actionId });
  expect(controller.getSnapshot()).toBe(paused);
  controller.send({ type: 'PAUSE', paused: false }); jest.advanceTimersByTime(5000);
  expect(controller.getSnapshot().gamePhase).toBe('applying_effect');
  expect(controller.getSnapshot().activePlayerIndex).toBe(0);
  controller.send({ type: 'MOTION_DONE', id: controller.getSnapshot().actionId });
  expect(controller.getSnapshot().gamePhase).toBe('turn_end');
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

function humanQuestion() {
  const controller = new RaceController(() => 0.3); controller.connect();
  controller.startGame('local_multiplayer', [player('p1', false), player('p2', false)]);
  controller.roll(); jest.advanceTimersByTime(750);
  return controller;
}

test('correct feedback must finish its actual dismissal before any movement; pause and stale callbacks cannot bypass it', () => {
  const controller = humanQuestion();
  controller.answer(answerText(controller.getSnapshot().question!));
  const visible = controller.getSnapshot();
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: visible.actionId });
  expect(controller.getSnapshot()).toBe(visible);
  jest.advanceTimersByTime(1100);
  const closing = controller.getSnapshot();
  expect(closing.gamePhase).toBe('closing_answer'); expect(closing.question).not.toBeNull();
  expect(closing.players[0].position).toBe(0); expect(closing.motion).toBeNull();
  jest.advanceTimersByTime(60000);
  expect(controller.getSnapshot()).toBe(closing); expect(jest.getTimerCount()).toBe(0);
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: visible.actionId });
  expect(controller.getSnapshot()).toBe(closing);
  controller.send({ type: 'PAUSE', paused: true });
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: closing.actionId });
  expect(controller.getSnapshot().players[0].position).toBe(0);
  controller.send({ type: 'PAUSE', paused: false });
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: closing.actionId });
  const moving = controller.getSnapshot();
  expect(moving.gamePhase).toBe('moving'); expect(moving.question).toBeNull(); expect(moving.players[0].position).toBe(1);
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: closing.actionId });
  expect(controller.getSnapshot()).toBe(moving); controller.disconnect();
});

test.each(['incorrect', 'timeout'] as const)('dice 4 with %s never reaches or activates the first shortcut', failure => {
  const controller = new RaceController(() => 0.55); controller.connect();
  controller.startGame('local_multiplayer', [player('p1', false), player('p2', false)]);
  controller.roll(); jest.advanceTimersByTime(750);
  expect(controller.getSnapshot().currentDiceValue).toBe(4);
  if (failure === 'timeout') jest.advanceTimersByTime(QUESTION_TIME_LIMIT_MS);
  else controller.answer('wrong');
  expect(controller.getSnapshot().answerFailure).toBe(failure);
  controller.acknowledgeAnswer();
  expect(controller.getSnapshot().players[0].currentTileId).toBe('tile_0');
  expect(controller.getSnapshot().motion).toBeNull();
  expect(controller.getSnapshot().diceLanding).toBeNull();
  expect(controller.getSnapshot().gamePhase).toBe('turn_end');
  controller.disconnect();
});
test('30-second timeout counts once, keeps explanation indefinitely and waits for human acknowledgement', () => {
  const controller = humanQuestion();
  expect(controller.getQuestionTimeRemaining()).toBe(QUESTION_TIME_LIMIT_MS);
  expect(jest.getTimerCount()).toBe(1);
  jest.advanceTimersByTime(29999); expect(controller.getSnapshot().gamePhase).toBe('showing_question');
  expect(controller.getQuestionTimeRemaining()).toBe(1);
  jest.advanceTimersByTime(1);
  const expired = controller.getSnapshot();
  expect(expired.answerFailure).toBe('timeout'); expect(expired.answerCorrect).toBe(false);
  expect(expired.incorrectCount).toBe(1); expect(expired.players[0].position).toBe(0);
  expect(controller.getQuestionTimeRemaining()).toBe(0); expect(jest.getTimerCount()).toBe(0);
  jest.advanceTimersByTime(60000); controller.answer(answerText(expired.question!));
  controller.send({ type: 'QUESTION_TIMEOUT', id: expired.actionId });
  controller.send({ type: 'ANSWER_FEEDBACK_DONE', id: expired.actionId });
  expect(controller.getSnapshot()).toBe(expired);
  controller.acknowledgeAnswer(); expect(controller.getSnapshot().gamePhase).toBe('turn_end');
  expect(controller.getSnapshot().question).toBeNull();
  jest.advanceTimersByTime(700);
  controller.send({ type: 'HANDOVER', id: controller.getSnapshot().actionId });
  controller.roll(); jest.advanceTimersByTime(750);
  expect(controller.getSnapshot().answerFailure).toBeNull();
  expect(controller.getQuestionTimeRemaining()).toBe(QUESTION_TIME_LIMIT_MS);
  expect(jest.getTimerCount()).toBe(1); controller.disconnect();
});
test('incorrect human answer stops countdown immediately and has no auto-dismiss timer', () => {
  const controller = humanQuestion(); jest.advanceTimersByTime(4250); controller.answer('not a number');
  expect(controller.getSnapshot().answerFailure).toBe('incorrect');
  const remaining = controller.getQuestionTimeRemaining(); expect(remaining).toBe(25750);
  expect(jest.getTimerCount()).toBe(0); jest.advanceTimersByTime(60000);
  expect(controller.getQuestionTimeRemaining()).toBe(remaining);
  expect(controller.getSnapshot().gamePhase).toBe('evaluating_answer');
  controller.send({ type: 'PAUSE', paused: true }); controller.acknowledgeAnswer();
  expect(controller.getSnapshot().gamePhase).toBe('evaluating_answer');
  controller.send({ type: 'PAUSE', paused: false }); controller.acknowledgeAnswer();
  expect(controller.getSnapshot().gamePhase).toBe('turn_end'); controller.disconnect();
});
test('question deadline freezes on pause and disconnect, resumes remaining time, and rejects late answers', () => {
  const controller = humanQuestion(); jest.advanceTimersByTime(10000);
  controller.send({ type: 'PAUSE', paused: true }); jest.advanceTimersByTime(45000);
  expect(controller.getQuestionTimeRemaining()).toBe(20000); expect(jest.getTimerCount()).toBe(0);
  controller.send({ type: 'PAUSE', paused: false }); jest.advanceTimersByTime(5000);
  controller.disconnect(); jest.advanceTimersByTime(60000);
  expect(controller.getQuestionTimeRemaining()).toBe(15000);
  controller.connect(); expect(jest.getTimerCount()).toBe(1);
  // Advance wall time without running pending JS callbacks, as when a tab is backgrounded.
  jest.setSystemTime(Date.now() + 15001);
  controller.answer(answerText(controller.getSnapshot().question!));
  expect(controller.getSnapshot().answerFailure).toBe('timeout');
  expect(jest.getTimerCount()).toBe(0); controller.disconnect();
});
test('correct answer before deadline cancels timeout, and restart removes old question timers', () => {
  const controller = humanQuestion(); jest.advanceTimersByTime(29999);
  controller.answer(answerText(controller.getSnapshot().question!));
  expect(controller.getSnapshot().answerCorrect).toBe(true); jest.advanceTimersByTime(1100);
  controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: controller.getSnapshot().actionId });
  expect(controller.getSnapshot().gamePhase).toBe('moving'); expect(controller.getSnapshot().incorrectCount).toBe(0);
  controller.startGame('single', [player('p1', false), player('p2')]);
  expect(jest.getTimerCount()).toBe(0); jest.advanceTimersByTime(60000);
  expect(controller.getSnapshot().gamePhase).toBe('ready_to_roll'); controller.disconnect();
});
test.each([true, false])('human rewards auto-apply once; optional cleanse chosen=%s', useStar => {
  let value = 0;
  const controller = new RaceController(() => value); controller.connect();
  controller.startGame('local_multiplayer', [player('p1', false), player('p2', false)]);
  const land = (roll: number, mystery: number) => {
    value = roll; controller.roll(); jest.advanceTimersByTime(750);
    controller.answer(answerText(controller.getSnapshot().question!)); jest.advanceTimersByTime(1100);
    controller.send({ type: 'ANSWER_FEEDBACK_DISMISSED', id: controller.getSnapshot().actionId });
    while (controller.getSnapshot().motion)
      controller.send({ type: 'MOTION_DONE', id: controller.getSnapshot().actionId });
    value = mystery; jest.advanceTimersByTime(0);
    expect(controller.getSnapshot().gamePhase).toBe('rolling_mystery');
    controller.send({ type: 'SPIN_DONE', id: controller.getSnapshot().actionId });
  };
  const next = () => {
    jest.advanceTimersByTime(700); controller.send({ type: 'HANDOVER', id: controller.getSnapshot().actionId });
  };
  land(0, 0.99); // Die 1 → bonus → cleanse.
  jest.advanceTimersByTime(MYSTERY_RESULT_DISPLAY_MS - 1);
  expect(controller.getSnapshot().players[0].cleanseCount).toBe(0);
  jest.advanceTimersByTime(1); expect(controller.getSnapshot().players[0].cleanseCount).toBe(1);
  next(); land(0, 0.99); jest.advanceTimersByTime(MYSTERY_RESULT_DISPLAY_MS); next();
  land(0.7, 0.3); // Die 5 from tile_1 → penalty tile_5, passing entry.
  expect(controller.getSnapshot().mysteryRollState?.canUseCleanse).toBe(true);
  jest.advanceTimersByTime(2000); controller.send({ type: 'PAUSE', paused: true });
  jest.advanceTimersByTime(20000); expect(controller.getSnapshot().gamePhase).toBe('mystery_result');
  controller.send({ type: 'PAUSE', paused: false });
  if (useStar) {
    controller.apply(true); // Optional star cancels the pending automatic penalty.
    const cleansed = controller.getSnapshot(); expect(cleansed.players[0].cleanseCount).toBe(0);
    expect(cleansed.players[0].currentTileId).toBe('tile_5');
    jest.advanceTimersByTime(CLEANSE_CHOICE_MS);
    expect(controller.getSnapshot().players[0].currentTileId).toBe('tile_5');
  } else {
    const result = controller.getSnapshot().mysteryRollState!.result;
    jest.advanceTimersByTime(CLEANSE_CHOICE_MS - 2000 - 1);
    expect(controller.getSnapshot().gamePhase).toBe('mystery_result');
    jest.advanceTimersByTime(1);
    while (controller.getSnapshot().motion)
      controller.send({ type: 'MOTION_DONE', id: controller.getSnapshot().actionId });
    expect(controller.getSnapshot().gamePhase).toBe('turn_end');
    expect(controller.getSnapshot().players[0].cleanseCount).toBe(1);
    expect(controller.getSnapshot().players[0].position).toBe(result === 'retreat_1' ? 5 : result === 'retreat_2' ? 4 : 6);
    expect(controller.getSnapshot().diceLanding).toBeNull();
  }
  controller.disconnect(); expect(jest.getTimerCount()).toBe(0);
});
