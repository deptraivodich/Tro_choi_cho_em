import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, sleep, observeRace } from './lib/cdp.mjs';

const baseUrl = process.env.GAME_URL || 'http://localhost:8090';
const reducedMotion = process.argv.includes('--reduced-motion');
const output = `artifacts/race-e2e${reducedMotion ? '-reduced' : ''}`;
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
      if (state.gamePhase === 'ready_to_roll' && !active.isBot) await session.click('[data-testid="roll-dice-button"]');
      if (state.gamePhase === 'showing_question' && !active.isBot && previousQuestion !== state.question.key) {
        previousQuestion = state.question.key; questions++;
        await submitQuestion(session, state.question, questions === 1);
      }
      if (state.gamePhase === 'awaiting_fork_choice' && !active.isBot) await session.click('[data-testid="choose-shortcut"]');
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
        if (!active.isBot) {
          if (state.mysteryRollState.type === 'bonus') await session.click('[data-testid="claim-reward"]');
          else if (state.mysteryRollState.canUseCleanse) await session.click('[data-testid="use-cleanse"]');
          else await session.click('[data-testid="apply-penalty"]');
        }
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
  if (!reducedMotion) { await smallScreen(); console.log('Small-screen gameplay checks passed'); }
  await completeGame();
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: true, checks }, null, 2));
  console.log(`PASS: ${checks.length} UI checks; artifacts in ${output}`);
} catch (error) {
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: false, checks, error: String(error) }, null, 2));
  throw error;
}
