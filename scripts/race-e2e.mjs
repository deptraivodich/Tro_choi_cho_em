import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, sleep, observeRace } from './lib/cdp.mjs';

const baseUrl = process.env.GAME_URL || 'http://localhost:8090';
const reducedMotion = process.argv.includes('--reduced-motion');
const presentationOnly = process.argv.includes('--presentation-only');
const shortcutOnly = process.argv.includes('--shortcut-only');
const acceptanceOnly = process.argv.includes('--acceptance-only');
const output = acceptanceOnly ? 'artifacts/race-acceptance-ui' : shortcutOnly ? 'artifacts/race-shortcut-ui' : presentationOnly ? 'artifacts/race-reference-ui' : `artifacts/race-e2e${reducedMotion ? '-reduced' : ''}`;
await mkdir(output, { recursive: true });
const checks = [];
function check(condition, description) { assert.ok(condition, description); checks.push(description); }
async function waitFor(session, predicate, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await predicate()) return; await sleep(150); }
  throw new Error('UI condition timed out');
}
async function clickText(session, text) {
  const selector = await session.evaluate(`(() => {
    document.querySelectorAll('[data-ui-click]').forEach(e => e.removeAttribute('data-ui-click'));
    const target = ${JSON.stringify(text)};
    const matches = Array.from(document.querySelectorAll('div,button')).filter(e => (target.length === 1 ? e.textContent.trim() === target : e.textContent.includes(target)) && e.getBoundingClientRect().width);
    matches.sort((a,b) => a.textContent.length-b.textContent.length || a.childElementCount-b.childElementCount);
    const leaf = matches[0];
    const element = leaf && (leaf.closest('[role="button"],[tabindex="0"]') || leaf);
    if (!element) return null;
    element.setAttribute('data-ui-click', 'target'); return '[data-ui-click="target"]';
  })()`);
  return selector ? session.click(selector) : false;
}
async function enter(session, local = false) {
  console.log(`Loading lobby (${local ? 'local' : 'bot'} game)...`);
  await session.send('Page.navigate', { url: baseUrl });
  await waitFor(session, () => session.evaluate(`document.body.innerText.includes('Đua Về Đích')`), 120000);
  check(await session.click('[data-testid="game-card-play-race-to-finish"]'), 'Lobby card navigates to race');
  console.log('Opened race setup');
  await waitFor(session, () => session.evaluate(`!!document.querySelector('[data-testid="start-race-button"]')`));
  await sleep(600);
  if (local) check(await clickText(session, 'Chơi cùng bạn'), 'Local multiplayer setup');
  await clickText(session, '2 Người chơi');
  check(await session.click('[data-testid="start-race-button"]'), 'Setup starts actual game');
  await waitFor(session, async () => !!(await session.evaluate(observeRace)));
  const initial = await session.evaluate(observeRace);
  check(initial.players.length === 2 && initial.gameMode === (local ? 'local_multiplayer' : 'single'), 'Selected mode and player count match actual game state');
  await sleep(300);
  console.log('Race board ready');
}
async function submitQuestion(session, question, wrong = false) {
  if (question.choices) {
    const answer = wrong ? question.choices.find(choice => choice !== question.answer) : question.answer;
    await clickText(session, answer);
  } else {
    // Enter the exact fraction through the visible TextInput; all grading happens in the app.
    const answer = wrong ? String(question.answer.n / question.answer.d + 1) : `${question.answer.n}/${question.answer.d}`;
    await session.evaluate(`(() => {
      const input = document.querySelector('[data-testid="math-answer-input"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(answer)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await sleep(80); check(await session.click('[data-testid="math-submit"]'), 'Math answer submitted through visible input');
  }
}
async function smallScreen() {
  const session = await browserSession(320, 568);
  try {
    await enter(session, true);
    let state = await session.evaluate(observeRace);
    const first = state.players.map(p => p.currentTileId);
    check(await session.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), '320px: page does not overflow horizontally');
    check(await session.evaluate(`document.querySelectorAll('[data-testid="turn-dashboard"]').length === 1 && document.querySelectorAll('[data-testid="roll-dice-button"]').length === 1`), '320px: one live dice area and one roll action');
    check(await session.evaluate(`(() => {
      const panel = document.querySelector('[data-testid="turn-dashboard"]').getBoundingClientRect();
      const board = document.querySelector('[data-testid="race-board"]').getBoundingClientRect();
      const button = document.querySelector('[data-testid="roll-dice-button"]').getBoundingClientRect();
      const dice = document.querySelector('[data-testid="animated-dice"]').getBoundingClientRect();
      return panel.height <= 155 && Math.abs(panel.top - board.bottom) <= 2 &&
        button.height >= 48 && button.left >= panel.left && button.right <= panel.right &&
        Math.abs(button.top - dice.top) < 10;
    })()`), '320px: dice and 48px roll button share a compact row directly below the board');
    const rects = await session.evaluate(`Array.from(document.querySelectorAll('[data-testid^="token-"]')).map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })`);
    check(rects.length === 2 && Math.hypot(rects[0].x - rects[1].x, rects[0].y - rects[1].y) >= rects[0].width * 0.65, '320px: two same-tile sprites visibly separated');
    check(rects.every(r => r.x >= 0 && r.x + r.width <= 320 && r.y >= 68 && r.y + r.height <= 568), '320px: both starting tokens are actually visible on screen');
    await session.screenshot(`${output}/small-board.png`);
    check(await session.click('[data-testid="roll-dice-button"]'), 'Human can roll');
    await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    state = await session.evaluate(observeRace);
    check(JSON.stringify(state.players.map(p => p.currentTileId)) === JSON.stringify(first), 'Dice and repeated click cannot move tokens before math');
    check(await session.evaluate(`(() => { const input = document.querySelector('[data-testid="math-answer-input"]'); const submit = document.querySelector('[data-testid="math-submit"]'); const el = input || document.querySelector('[role="button"]'); const r = el.getBoundingClientRect(); return r.width > 40 && r.height >= 48 && r.x >= 0 && r.right <= innerWidth; })()`), '320px: question controls readable and at least 48px high');
    await sleep(450);
    await session.screenshot(`${output}/small-question.png`);
    await submitQuestion(session, state.question, true);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'evaluating_answer');
    await sleep(3500);
    check((await session.evaluate(observeRace)).gamePhase === 'evaluating_answer', 'Wrong-answer explanation persists beyond former auto-dismiss delay');
    check(await session.click('[data-testid="math-understood"]'), 'Human explicitly acknowledges wrong-answer explanation');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.activePlayerIndex === 1);
    state = await session.evaluate(observeRace);
    check(state.players[0].currentTileId === first[0], 'Wrong answer leaves logical position unchanged through handover');
    check(await clickText(session, 'SẴN SÀNG ĐỔ XÚC XẮC'), 'Handover confirms next player');
    await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    state = await session.evaluate(observeRace); await submitQuestion(session, state.question);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'moving');
    check(await session.click('[aria-label="Tạm dừng"]'), 'Pause available during actual movement');
    await sleep(250); const paused = await session.evaluate(observeRace);
    await sleep(900); const still = await session.evaluate(observeRace);
    check(paused.isPaused && still.actionId === paused.actionId && JSON.stringify(still.players) === JSON.stringify(paused.players), 'Pause freezes turn state and motion');
    await session.screenshot(`${output}/small-paused.png`);
    check(await clickText(session, 'Tiếp tục chơi'), 'Resume preserves turn');
    // Exit while a callback/animation may still be pending: navigation cleanup must succeed.
    await session.click('[aria-label="Về sảnh"]');
    await waitFor(session, () => session.evaluate(`location.pathname === '/'`));
    await sleep(1000); check(session.exceptions.length === 0, 'No runtime exceptions after exit/cleanup');
  } catch (error) {
    await session.screenshot(`${output}/small-failure.png`);
    console.log(await session.evaluate('document.body.innerText.slice(-2500)'));
    console.log(session.exceptions);
    throw error;
  } finally { await session.close(); }
}
async function referencePresentation() {
  const session = await browserSession(1440, 1000);
  try {
    await enter(session, true);
    check(await session.evaluate(`document.querySelectorAll('[data-testid="turn-dashboard"]').length === 1`), 'Desktop: exactly one dice dashboard');
    check(await session.evaluate(`(() => { const board = document.querySelector('[data-testid="race-board"]'); const r = board.getBoundingClientRect(); return Math.abs(r.height / r.width - 0.45) < 0.001 && getComputedStyle(board).overflow === 'hidden'; })()`), 'Painted duplicate dice panel is clipped below the playable board');
    check(await session.evaluate(`document.querySelectorAll('[data-testid^="board-correction-"]').length === 20`), 'Eighteen single-arrow corrections and both relocated bonus circles render');
    check(await session.evaluate(`(() => {
      const board = document.querySelector('[data-testid="race-board"]').getBoundingClientRect();
      const panel = document.querySelector('[data-testid="turn-dashboard"]').getBoundingClientRect();
      return Math.abs(panel.top - board.bottom) <= 2 && panel.width <= 640 && panel.height <= 150;
    })()`), 'Desktop dice controls are compact and directly adjacent to the board');
    await session.screenshot(`${output}/desktop-corrected-board.png`);
    await session.click('[data-testid="roll-dice-button"]');
    const readDice = () => session.evaluate(`({ transform: getComputedStyle(document.querySelector('[data-testid="animated-dice"]')).transform, face: document.querySelector('[data-testid="dice-face"]')?.getAttribute('aria-label') })`);
    const first = await readDice(); await sleep(140); const second = await readDice();
    check(first.transform !== second.transform && first.face !== second.face, 'Dice rotation, bounce and face visibly change across rendered frames');
    await session.screenshot(`${output}/desktop-dice-rolling.png`);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    const state = await session.evaluate(observeRace);
    check(await session.evaluate(`document.querySelector('[data-testid="dice-face"]').getAttribute('aria-label') === ${JSON.stringify('Xúc xắc ' + state.currentDiceValue)}`), 'Dice settles on the same result used by the math question');
    check(state.players.every(p => p.currentTileId === 'tile_0'), 'Dice presentation never advances a token before math');
    check(session.exceptions.length === 0, 'Desktop presentation has no runtime exceptions');
  } finally { await session.close(); }
}
async function referenceShortcut() {
  const session = await browserSession(1440, 1000);
  try {
    // Seed every PRNG through the normal constructor; never write the game store.
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Math.random = () => 1 / 0xffffffff;' });
    await enter(session, true);
    await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    let state = await session.evaluate(observeRace);
    check(state.currentDiceValue === 4, 'Seeded real dice lands exactly on the first shortcut entry');
    await submitQuestion(session, state.question);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'awaiting_fork_choice');
    state = await session.evaluate(observeRace);
    check(state.players[0].currentTileId === 'tile_4' && state.motion === null && state.forkChoiceState.remainingSteps === 0, 'Exact arrival animation finishes before the shortcut choice opens');
    await session.screenshot(`${output}/entry.png`);
    await session.click('[data-testid="choose-shortcut"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'applying_effect');
    const selector = `[data-testid="token-${state.players[0].id}"]`;
    const sample = () => session.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).transform`);
    const before = await sample(); await sleep(200); const after = await sample();
    check(before !== after, 'Shortcut visibly traverses across the board over successive frames');
    state = await session.evaluate(observeRace);
    check(state.gamePhase === 'applying_effect', 'Shortcut has a longer traversal than an ordinary tile step');
    await session.screenshot(`${output}/crossing.png`);
    await waitFor(session, async () => {
      const arrived = await session.evaluate(observeRace);
      return arrived?.players[0].currentTileId === 'tile_8_mid' && arrived.motion === null;
    });
    state = await session.evaluate(observeRace);
    check(state.players[0].currentTileId === 'tile_8_mid', 'First shortcut ends at the blue circle next to its painted exit');
    check(JSON.stringify(state.players[0].pathHistory) === JSON.stringify(['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_8_mid']), 'Only four dice steps then one shortcut traverse enter path history');
    await session.screenshot(`${output}/exit.png`);
    check(session.exceptions.length === 0, 'Shortcut traversal has no runtime exception');
  } finally { await session.close(); }
}
async function referencePassThrough() {
  const session = await browserSession(1440, 1000);
  try {
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Math.random = () => 4 / 0xffffffff;' });
    await enter(session, true);
    await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    let state = await session.evaluate(observeRace);
    check(state.currentDiceValue === 6, 'Seeded real dice will pass the first entry and land beyond it');
    await submitQuestion(session, state.question);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'moving');
    let sawEntry = false;
    while (true) {
      state = await session.evaluate(observeRace);
      check(state.gamePhase !== 'awaiting_fork_choice' && state.forkChoiceState === null,
        'Pass-through animation never opens shortcut state');
      check(await session.evaluate(`!document.querySelector('[data-testid="choose-shortcut"]')`),
        'Pass-through animation never renders shortcut prompt');
      if (state.players[0].currentTileId === 'tile_4') sawEntry = true;
      if (state.gamePhase === 'rolling_mystery') break; // Six steps land on the existing penalty tile.
      assert.ok(state.gamePhase === 'moving' || state.gamePhase === 'evaluating_tile');
      await sleep(70);
    }
    check(sawEntry, 'Observed actual intermediate animation at the shortcut entrance');
    check(state.players[0].currentTileId === 'tile_5', 'Six steps follow the main route past entry and swapped bonus');
    check(!state.players[0].pathHistory.includes('tile_8_mid'), 'Passing entry does not traverse the shortcut');
    await session.screenshot(`${output}/pass-through.png`);
    check(session.exceptions.length === 0, 'Pass-through gameplay has no runtime exception');
  } finally { await session.close(); }
}
async function referenceEffectEntries(seed, finishAtSecondShortcut) {
  const session = await browserSession(1440, 1000);
  const observations = new Set();
  let answered = null, lastAction = -1;
  try {
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: `Math.random = () => ${seed} / 0xffffffff;` });
    await enter(session, true);
    const started = Date.now();
    for (;;) {
      const state = await session.evaluate(observeRace);
      const active = state.players[state.activePlayerIndex];
      assert.ok(Date.now() - started < 180000, 'Reference effect-entry scenario exceeded three minutes');
      if (state.actionId !== lastAction) {
        lastAction = state.actionId;
        if (state.motion) {
          check(state.diceLanding === null && state.forkChoiceState === null, 'Moving and reward/penalty steps never retain a shortcut landing');
          check(await session.evaluate(`!document.querySelector('[data-testid="choose-shortcut"]')`), 'No shortcut prompt during dice or effect animation');
          if (['tile_4', 'tile_16'].includes(active.currentTileId)) observations.add(`${state.gamePhase}:${active.currentTileId}`);
        }
      }
      if (state.gamePhase === 'turn_handover') await clickText(session, 'SẴN SÀNG ĐỔ XÚC XẮC');
      else if (state.gamePhase === 'ready_to_roll') await session.click('[data-testid="roll-dice-button"]');
      else if (state.gamePhase === 'showing_question' && answered !== state.question.key) {
        answered = state.question.key; await submitQuestion(session, state.question);
      } else if (state.gamePhase === 'awaiting_fork_choice') {
        check(state.motion === null && state.diceLanding?.tileId === active.currentTileId &&
          state.diceLanding.playerIndex === state.activePlayerIndex && state.diceLanding.turnId === state.turnId,
          'Choice belongs to the completed dice landing of this player and turn');
        if (finishAtSecondShortcut && active.currentTileId === 'tile_16') {
          check(observations.has('applying_effect:tile_16'), 'Observed bonus advance_2 landing exactly on second entry without opening a choice');
          check(observations.has('moving:tile_16'), 'Observed later dice movement passing second entry without opening a choice');
          await session.screenshot(`${output}/second-entry.png`);
          await session.click('[data-testid="choose-shortcut"]');
          await waitFor(session, async () => {
            const current = await session.evaluate(observeRace);
            return current.players[state.activePlayerIndex].currentTileId === 'tile_30' && current.motion === null;
          });
          check(true, 'Second shortcut traverses only after exact dice landing; exit stays normal after the bonus swap');
          await session.screenshot(`${output}/second-exit.png`); break;
        }
        await session.click('[data-testid="choose-main"]');
      } else if (!finishAtSecondShortcut && state.gamePhase === 'turn_end' && active.currentTileId === 'tile_4') {
        check(observations.has('applying_effect:tile_4'), 'Observed penalty retreat_2 returning to first entry');
        check(state.diceLanding === null && state.forkChoiceState === null, 'Penalty landing at entry ends the turn without a shortcut choice');
        await session.screenshot(`${output}/penalty-entry-no-choice.png`); break;
      }
      await sleep(70);
    }
    check(session.exceptions.length === 0, 'Effect-entry reference gameplay has no runtime exceptions');
  } finally { await session.close(); }
}
async function acceptanceQuestions() {
  const session = await browserSession(320, 568);
  try {
    await enter(session, true);
    check(await session.evaluate(`document.documentElement.lang === 'vi' && !document.documentElement.translate &&
      !!document.querySelector('meta[name="google"][content="notranslate"]')`), 'Vietnamese and math text are protected from automatic page translation');
    await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    let state = await session.evaluate(observeRace);
    check(await session.evaluate(`document.querySelector('[data-testid="math-prompt"]').textContent === ${JSON.stringify(state.question.prompt)}`),
      'Visible question exactly matches generator text, including all operators');
    check(await session.evaluate(`!!document.querySelector('[data-testid="question-countdown"]')`), 'Question includes a visible countdown bar');
    await submitQuestion(session, state.question, true);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'evaluating_answer');
    check(await session.evaluate(`document.querySelector('[data-testid="math-feedback"]').textContent.includes('Không đúng, sau đây là đáp án và cách giải.')`), 'Wrong-answer wording is exact');
    const stopped = await session.evaluate(`document.querySelector('[data-testid="question-time-left"]').textContent`);
    await sleep(6500);
    state = await session.evaluate(observeRace);
    check(state.gamePhase === 'evaluating_answer' && state.incorrectCount === 1 && state.players.every(p => p.position === 0),
      'Wrong feedback stays open without movement or extra incorrect counts');
    check(await session.evaluate(`document.querySelector('[data-testid="question-time-left"]').textContent === ${JSON.stringify(stopped)}`), 'Answer immediately stops the countdown');
    await session.screenshot(`${output}/wrong-answer.png`);
    check(await session.click('[data-testid="math-understood"]'), 'Wrong answer closes through Đã hiểu');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'turn_handover');
    check(await clickText(session, 'SẴN SÀNG ĐỔ XÚC XẮC'), 'Second player confirms handover');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'ready_to_roll');
    await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    check(await session.evaluate(`document.querySelector('[data-testid="question-time-left"]').textContent.includes('30 giây')`), 'New question resets to 30 seconds');
    await sleep(2200);
    check(await session.evaluate(`Number(document.querySelector('[data-testid="question-countdown"]').getAttribute('aria-valuenow')) <= 28`), 'Countdown actually decreases on the rendered screen');
    await session.screenshot(`${output}/countdown.png`);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.answerFailure === 'timeout', 40000);
    state = await session.evaluate(observeRace);
    check(state.incorrectCount === 2 && state.players.every(p => p.position === 0), 'Real 30-second timeout counts as one wrong answer and leaves tokens in place');
    check(await session.evaluate(`document.querySelector('[data-testid="math-feedback"]').textContent.includes('Đã hết thời gian, sau đây là đáp án và cách giải.') &&
      document.querySelector('[data-testid="question-time-left"]').textContent.includes('0 giây')`), 'Timeout feedback and zero-second counter are exact');
    await sleep(3500); check((await session.evaluate(observeRace)).gamePhase === 'evaluating_answer', 'Timeout explanation also waits indefinitely for acknowledgement');
    check(await session.evaluate(`(() => {
      const button = document.querySelector('[data-testid="math-understood"]').getBoundingClientRect();
      return button.top >= 0 && button.bottom <= innerHeight && button.height >= 48 &&
        !document.querySelector('[data-testid="math-answer-input"],[data-testid="math-submit"]');
    })()`), '320px: acknowledgement stays visible below scrollable feedback and graded inputs are removed');
    await session.screenshot(`${output}/timeout.png`);
    check(await session.click('[data-testid="math-understood"]'), 'Timed-out question closes through Đã hiểu');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'turn_handover');
    await clickText(session, 'SẴN SÀNG ĐỔ XÚC XẮC'); await session.click('[aria-label="Về sảnh"]');
    await waitFor(session, () => session.evaluate(`location.pathname === '/'`));
    check(await session.evaluate(`document.documentElement.lang === 'en' && !document.documentElement.classList.contains('notranslate')`),
      'Game text protection cleans up when leaving the game');
    check(session.exceptions.length === 0, 'Wrong answer and real timeout have no runtime exceptions');
  } catch (error) {
    await session.screenshot(`${output}/question-failure.png`); throw error;
  } finally { await session.close(); }
}
async function acceptanceMystery(seed, type) {
  const session = await browserSession(1440, 1000);
  try {
    await session.send('Page.addScriptToEvaluateOnNewDocument', { source: `Math.random = () => ${seed} / 0xffffffff;` });
    await enter(session, true); await session.click('[data-testid="roll-dice-button"]');
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'showing_question');
    let state = await session.evaluate(observeRace); await submitQuestion(session, state.question);
    await waitFor(session, async () => (await session.evaluate(observeRace))?.gamePhase === 'mystery_result');
    state = await session.evaluate(observeRace);
    check(state.mysteryRollState.type === type, `Actual dice movement reaches a ${type} tile`);
    check(await session.evaluate(`document.querySelector('[data-testid="mystery-title"]').textContent.trim() === ${JSON.stringify(type === 'bonus' ? 'Ô Thưởng Bí Ẩn' : 'Ô Phạt Bí Ẩn')}`), `${type} title is exact, with no overlapping text`);
    check(await session.evaluate(`!document.querySelector('[data-testid="claim-reward"],[data-testid="apply-penalty"]')`), `${type} has no redundant confirmation button`);
    const result = state.mysteryRollState.result, before = state.players[0];
    await session.screenshot(`${output}/${type}-result.png`);
    await waitFor(session, async () => {
      const s = await session.evaluate(observeRace);
      return s.motion === null && ['turn_end', 'turn_handover'].includes(s.gamePhase);
    });
    state = await session.evaluate(observeRace); const after = state.players[0];
    const expectedPosition = result === 'advance_1' ? before.position + 1 : result === 'advance_2' ? before.position + 2
      : result === 'retreat_1' ? Math.max(0, before.position - 1) : result === 'retreat_2' ? Math.max(0, before.position - 2)
      : result === 'reset_start' ? 0 : before.position;
    check(after.position === expectedPosition, `${type}: ${result} applies the exact movement automatically once`);
    if (result === 'shield') check(after.hasShield, 'Shield reward is granted automatically');
    if (result === 'cleanse') check(after.cleanseCount === 1, 'Cleanse reward is granted automatically');
    if (result === 'skip_turn') check(after.skipNextTurn, 'Skip-turn penalty is scheduled automatically');
    check(session.exceptions.length === 0, `${type} automatic application has no runtime exceptions`);
  } finally { await session.close(); }
}
async function completeGame() {
  const session = await browserSession(390, 844, reducedMotion);
  let questions = 0, spins = 0, movementSamples = 0, botAnswers = [], lastBotAnswer = -1;
  let previousQuestion = null, lastAction = -1, lastChange = Date.now(), measuredSpins = new Set();
  try {
    await enter(session);
    await session.screenshot(`${output}/phone-board.png`);
    const start = Date.now();
    for (;;) {
      const state = await session.evaluate(observeRace);
      if (!state) throw new Error('Game store disappeared');
      if (state.actionId !== lastAction) { lastAction = state.actionId; lastChange = Date.now(); }
      assert.ok(Date.now() - lastChange < 20000, `Stuck at ${state.gamePhase}`);
      assert.ok(Date.now() - start < 480000, 'Complete game exceeded 8 minutes');
      const active = state.players[state.activePlayerIndex];
      if (state.gamePhase === 'finished') {
        check(state.winner.currentTileId === 'tile_49', 'Actual UI game reaches finish and declares winner');
        await sleep(600);
        await session.screenshot(`${output}/phone-victory.png`); break;
      }
      if (state.gamePhase === 'evaluating_answer' && active.isBot && state.actionId !== lastBotAnswer) {
        lastBotAnswer = state.actionId; botAnswers.push(state.answerCorrect);
      }
      if (state.gamePhase === 'evaluating_answer' && !active.isBot && state.answerCorrect === false)
        check(await session.click('[data-testid="math-understood"]'), 'Human wrong answer continues only through acknowledgement');
      if (state.gamePhase === 'ready_to_roll' && !active.isBot) await session.click('[data-testid="roll-dice-button"]');
      if (state.gamePhase === 'showing_question' && !active.isBot && previousQuestion !== state.question.key) {
        previousQuestion = state.question.key; questions++;
        await submitQuestion(session, state.question, questions === 1);
      }
      if (state.gamePhase === 'awaiting_fork_choice') {
        check(state.motion === null && state.forkChoiceState.remainingSteps === 0 && active.currentTileId === state.forkChoiceState.forkTileId,
          'Actual shortcut choice only appears after all movement finishes at the exact entry');
        if (!active.isBot) await session.click('[data-testid="choose-shortcut"]');
      }
      if (state.gamePhase === 'moving' && movementSamples < 3) {
        const selector = `[data-testid="token-${active.id}"]`;
        const sample = () => session.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).transform`);
        const before = await sample(); await sleep(80); const after = await sample();
        if (before !== after) movementSamples++;
      }
      if (state.gamePhase === 'rolling_mystery' && !measuredSpins.has(state.mysteryRollState.id)) {
        measuredSpins.add(state.mysteryRollState.id);
        const sample = () => session.evaluate(`getComputedStyle(document.querySelector('[data-testid="mystery-reel-track"]')).transform`);
        const first = await sample(); await sleep(150); const second = await sample(); await sleep(150); const third = await sample();
        if (reducedMotion) {
          check(await session.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`), 'OS reduced-motion preference is enabled');
          check((await session.evaluate(observeRace)).gamePhase === 'mystery_result', 'Reduced-motion reel finishes in under 400ms without changing the outcome');
        }
        else check(first !== second && second !== third, 'Reel transform moves across actual rendered frames');
        spins++; if (spins === 1) { await sleep(300); await session.screenshot(`${output}/phone-spinning.png`); }
      }
      if (state.gamePhase === 'mystery_result') {
        const result = await session.evaluate(`({ card: document.querySelector('[data-testid="mystery-winning-item"]')?.textContent, banner: document.querySelector('[data-testid="mystery-result"]')?.textContent, rect: document.querySelector('[data-testid="mystery-winning-item"]')?.getBoundingClientRect().toJSON(), viewport: document.querySelector('[data-testid="mystery-reel"]')?.getBoundingClientRect().toJSON(), pointer: document.querySelector('[data-testid="mystery-pointer"]')?.getBoundingClientRect().toJSON() })`);
        check(result.card === result.banner, 'Rendered selected reel card equals announced result');
        check(Math.abs(result.rect.x + result.rect.width / 2 - (result.viewport.x + result.viewport.width / 2)) < 2, 'Winning card stops exactly under center pointer');
        check(Math.abs(result.pointer.x + result.pointer.width / 2 - (result.rect.x + result.rect.width / 2)) < 2, 'Visible pointer aligns with winning card');
        check(await session.evaluate(`!document.querySelector('[data-testid="claim-reward"],[data-testid="apply-penalty"]')`),
          'Rewards and penalties have no redundant confirmation buttons');
      }
      await sleep(100);
    }
    check(questions >= 2 && (reducedMotion || movementSamples >= 1) && spins >= 1, 'Observed math, movement and real reel during end-to-end play');
    check(botAnswers.length >= 5, 'Observed at least one complete bot answer cycle in UI');
    for (let i = 0; i + 5 <= botAnswers.length; i += 5) check(botAnswers.slice(i, i + 5).filter(Boolean).length === 4, 'UI bot cycle answers exactly four out of five correctly');
    check(session.exceptions.length === 0, 'No browser runtime exceptions in complete game');
    await session.click('[data-testid="victory-exit"]'); await waitFor(session, () => session.evaluate(`location.pathname === '/'`));
    check(true, 'Victory returns to lobby');
    console.log(JSON.stringify({ questions, spins, movementSamples, botAnswers }));
  } finally { await session.close(); }
}
try {
  if (acceptanceOnly) { await acceptanceQuestions(); await acceptanceMystery(7, 'bonus'); await acceptanceMystery(4, 'penalty'); }
  else if (shortcutOnly) {
    await referenceShortcut(); await referencePassThrough();
    await referenceEffectEntries(2, true); await referenceEffectEntries(14, false);
  }
  else if (presentationOnly) await referencePresentation();
  else {
    if (!reducedMotion) { await referencePresentation(); await smallScreen(); console.log('Desktop and small-screen gameplay checks passed'); }
    await completeGame();
  }
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: true, checks }, null, 2));
  console.log(`PASS: ${checks.length} UI checks; artifacts in ${output}`);
} catch (error) {
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: false, checks, error: String(error) }, null, 2));
  throw error;
}
