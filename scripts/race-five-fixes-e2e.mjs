import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, observeRace, sleep } from './lib/cdp.mjs';
const safeArea = process.argv.includes('--safe-area');
const output = `artifacts/race-five-fixes${safeArea ? '/safe-area' : ''}`;
await mkdir(output, { recursive: true });
const checks = [], samples = [];
const check = (value, message) => { assert.ok(value, message); checks.push(message); };
const b = await browserSession(800, 360);
const state = () => b.evaluate(observeRace);
const world = () => b.evaluate(`getComputedStyle(document.querySelector('[data-testid="camera-world"]')).transform`);
async function wait(predicate, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await predicate()) return; await sleep(20); }
  throw new Error('Timed out waiting for presentation');
}
async function drag(from, to) {
  const point = (x, y) => ({ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 });
  await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(...from)] });
  for (let i = 1; i <= 12; i++) {
    await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point(
      from[0] + (to[0] - from[0]) * i / 12, from[1] + (to[1] - from[1]) * i / 12)] });
    await sleep(16);
  }
  await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function answer(q) {
  if (q.choices) {
    await b.evaluate(`(()=>{const e=Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent===${JSON.stringify(q.answer)});e.setAttribute('data-correct','yes')})()`);
    await b.click('[data-correct="yes"]');
  } else {
    await b.evaluate(`(()=>{const e=document.querySelector('[data-testid="math-answer-input"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(`${q.answer.n}/${q.answer.d}`)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await sleep(80); await b.click('[data-testid="math-submit"]');
  }
}
try {
  if (safeArea) await b.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 28, right: 18, top: 0, bottom: 14 } });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Math.random = () => 1 / 0xffffffff;' });
  await b.send('Page.navigate', { url: `${process.env.GAME_URL || 'http://localhost:8090'}/games/race-to-finish` });
  await wait(() => b.evaluate(`!!document.querySelector('[data-testid="start-race-button"]') && document.querySelector('[data-testid="start-race-button"]').getAttribute('aria-disabled') !== 'true'`), 180000);
  await b.evaluate(`(()=>{const leaf=Array.from(document.querySelectorAll('*')).filter(e=>e.textContent.trim()==='2 Người chơi').sort((a,b)=>a.childElementCount-b.childElementCount)[0];leaf.closest('[role="button"],[tabindex="0"]').setAttribute('data-two-players','yes')})()`);
  await b.click('[data-two-players="yes"]');
  await b.click('[data-testid="start-race-button"]');
  await wait(async () => !!await state() && !(await state()).isPaused);
  await sleep(300);
  check((await state()).players.length === 2, 'The real setup hands off exactly two players');
  check(await b.evaluate(`document.querySelector('[data-testid="race-player-roster"]').children.length===2 && document.querySelectorAll('[data-testid^="token-"]').length===2`), 'HUD has two participants and each gameplay token renders once');
  check(await b.evaluate(`Array.from(document.querySelectorAll('[data-testid="player-sprite-clip"]')).every(e=>getComputedStyle(e).overflow==='hidden')`), 'Principal sprite clipping is active on every token');
  check(await b.evaluate(`(()=>{const r=document.querySelector('[data-testid="game-camera"]').getBoundingClientRect();return r.x===0 && r.y===0 && r.width===innerWidth && r.height===innerHeight})()`), 'The camera fills the entire game viewport without inset strips');
  if (safeArea) check(await b.evaluate(`(()=>{const pause=document.querySelector('[data-testid="race-pause"]').getBoundingClientRect();const roll=document.querySelector('[data-testid="roll-dice-button"]').getBoundingClientRect();return pause.right<=innerWidth-18 && pause.left>=28 && roll.right<=innerWidth-18 && roll.bottom<=innerHeight-14})()`), 'Emulated notch/gesture insets protect controls while the map remains full bleed');
  await b.screenshot(`${output}/two-players-clean-tokens.png`);
  const focused = await world();
  await drag([610, 175], [230, 175]); await sleep(100);
  const manual = await world();
  check(manual !== focused, 'A touch drag pans the map away from the current player');
  await sleep(1200);
  check(await world() === manual, 'The camera holds manual position without snap-back');
  check((await state()).gamePhase === 'ready_to_roll', 'Manual camera inspection does not change game state');
  await b.screenshot(`${output}/manual-pan.png`);
  await b.click('[data-testid="roll-dice-button"]');
  check((await state()).gamePhase === 'ready_to_roll', 'Pressing Roll first waits for camera recenter completion');
  await b.click('[data-testid="race-pause"]');
  await wait(async () => (await state()).isPaused);
  const recenterState = await state(), recenterView = await world();
  check(recenterState.gamePhase === 'ready_to_roll', 'Pause can interrupt recenter before a die is rolled');
  await sleep(600);
  check(JSON.stringify(await state()) === JSON.stringify(recenterState) && await world() === recenterView, 'Pause freezes both recenter progress and its pending roll');
  await b.click('[data-testid="race-resume"]');
  await wait(async () => (await state()).gamePhase === 'rolling');
  check(await world() !== manual, 'Only the explicit Roll request reclaims camera focus');
  await wait(async () => (await state()).gamePhase === 'showing_question');
  await answer((await state()).question);
  await wait(async () => (await state()).gamePhase === 'closing_answer');
  // Click the public pause button promptly enough to sample the 180ms fade.
  await b.evaluate(`document.querySelector('[data-testid="race-pause"]').click()`);
  await wait(async () => (await state()).isPaused);
  const paused = await state();
  const opacity = await b.evaluate(`getComputedStyle(document.querySelector('[data-testid="math-feedback-layer"]')).opacity`);
  await sleep(800);
  check(JSON.stringify(await state()) === JSON.stringify(paused), 'Pause during feedback dismissal blocks all movement and callbacks');
  check(opacity === await b.evaluate(`getComputedStyle(document.querySelector('[data-testid="math-feedback-layer"]')).opacity`), 'Pause freezes the feedback fade at its current progress');
  await b.screenshot(`${output}/feedback-closing-paused.png`);
  const feedbackCamera = await world();
  await b.click('[data-testid="race-resume"]');
  for (let i = 0; i < 100; i++) {
    const sample = await b.evaluate(`(()=>{const s=${observeRace};const e=document.querySelector('[data-testid="math-feedback-layer"]');return {phase:s.gamePhase,tile:s.players[0].currentTileId,motion:s.motion,opacity:e?Number(getComputedStyle(e).opacity):0,feedbackMounted:!!e}})()`);
    samples.push(sample);
    if (sample.opacity > 0) {
      check(sample.tile === 'tile_0' && !sample.motion, 'A visible feedback frame cannot move the player');
      check(await world() === feedbackCamera, 'The camera stays frozen until feedback is completely closed');
    }
    if (sample.motion) { check(!sample.feedbackMounted, 'Feedback is completely unmounted before the first movement frame'); break; }
    await sleep(10);
  }
  check(samples.some(sample => !!sample.motion), 'Movement resumes after actual fade completion');
  await wait(async () => (await state()).players[0].currentTileId === 'tile_8_mid' && !(await state()).motion);
  check((await state()).players[0].pathHistory.join(',') === 'tile_0,tile_1,tile_2,tile_3,tile_4,tile_8_mid', 'Automatic shortcut still preserves exact landing and history');
  await b.screenshot(`${output}/shortcut-complete.png`);
  await drag([610, 175], [230, 175]); await sleep(80);
  const afterMovePan = await world();
  await sleep(1200);
  check(await world() === afterMovePan, 'Manual pan after movement remains in place across the next turn');
  check((await state()).activePlayerIndex === 1, 'The next bot turn cannot reclaim manual inspection by itself');
  await wait(async () => (await state()).activePlayerIndex === 1 && !!(await state()).motion);
  await wait(async () => await world() !== afterMovePan);
  check(true, 'Actual bot movement reclaims camera tracking after manual inspection');
  await b.click('[data-testid="race-pause"]'); await b.click('[data-testid="race-exit"]');
  await wait(() => b.evaluate(`location.pathname==='/'`));
  check(b.exceptions.length === 0, 'Pan, recenter, fade, pause, shortcut and exit produce no web runtime exceptions');
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: true, platform: 'web CDP touch; NOT native Android', checks, samples }, null, 2));
  console.log(`PASS: ${checks.length} checks for the five mobile fixes`);
} catch (error) {
  await b.screenshot(`${output}/failure.png`);
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: false, checks, samples, error: String(error), state: await state(), exceptions: b.exceptions }, null, 2));
  throw error;
} finally { await b.close(); }
