import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, observeRace, sleep } from './lib/cdp.mjs';
const output = 'artifacts/race-mobile';
await mkdir(output, { recursive: true });
const checks = [];
const check = (value, message) => { assert.ok(value, message); checks.push(message); };
let b = await browserSession(800, 360);
const state = () => b.evaluate(observeRace);
async function wait(predicate, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await predicate()) return; await sleep(60); }
  throw new Error('Mobile presentation condition timed out');
}
const transform = selector => b.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).transform`);
async function submit(q) {
  if (q.choices) {
    const selector = await b.evaluate(`(()=>{const e=Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent===${JSON.stringify(q.answer)}); e.setAttribute('data-answer','correct');return '[data-answer="correct"]'})()`);
    await b.click(selector);
  } else {
    await b.evaluate(`(()=>{const e=document.querySelector('[data-testid="math-answer-input"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(`${q.answer.n}/${q.answer.d}`)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await sleep(80); await b.click('[data-testid="math-submit"]');
  }
}
async function freeze(selectors) {
  await b.click('[data-testid="race-pause"]'); await sleep(180);
  const snapshot = await state(); const before = await Promise.all(selectors.map(transform));
  await sleep(1000);
  check(JSON.stringify(snapshot) === JSON.stringify(await state()), 'Pause preserves the complete engine snapshot');
  check(JSON.stringify(before) === JSON.stringify(await Promise.all(selectors.map(transform))), `Pause freezes ${selectors.join(', ')}`);
  check(await b.evaluate(`document.querySelector('[data-testid="race-pause-menu"]').querySelectorAll('[role="button"]').length === 2`), 'Pause exposes exactly two actions');
  await b.click('[data-testid="race-resume"]');
}
try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Math.random = () => 1 / 0xffffffff;' });
  await b.send('Page.navigate', { url: process.env.GAME_URL || 'http://localhost:8090/games/race-to-finish' });
  await wait(() => b.evaluate(`!!document.querySelector('[data-testid="start-race-button"]') && document.querySelector('[data-testid="start-race-button"]').getAttribute('aria-disabled') !== 'true'`));
  check(await b.evaluate(`['start-race-button','race-setup-exit'].every(id=>{const r=document.querySelector('[data-testid="'+id+'"]').getBoundingClientRect();return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth && r.height>=44})`), 'Both setup actions are visible and touchable');
  await b.screenshot(`${output}/setup-800.png`);
  await b.click('[data-testid="start-race-button"]');
  await wait(async () => !!await state()); await sleep(700);
  const overview = await transform('[data-testid="camera-world"]');
  await b.screenshot(`${output}/overview-800.png`);
  await freeze(['[data-testid="camera-world"]']);
  await wait(async () => !(await state()).isPaused);
  check(overview !== await transform('[data-testid="camera-world"]'), 'Camera smoothly transitions from overview to player zoom');
  await b.screenshot(`${output}/follow-800.png`);
  await b.click('[data-testid="roll-dice-button"]');
  await wait(async () => (await state()).gamePhase === 'rolling');
  await freeze(['[data-testid="rolling-dice"]', '[data-testid="camera-world"]']);
  await wait(async () => (await state()).gamePhase === 'showing_question');
  let s = await state();
  check(s.currentDiceValue === 4 && s.players.every(p => p.position === 0), 'One real die lands on 4; no token moves before math');
  await b.screenshot(`${output}/question-800.png`);
  await b.click('[data-testid="race-pause"]'); await sleep(150);
  const remaining = await b.evaluate(`document.querySelector('[data-testid="question-time-left"]').textContent`);
  await sleep(1300);
  check(remaining === await b.evaluate(`document.querySelector('[data-testid="question-time-left"]').textContent`), 'Question countdown stops under Pause');
  await b.screenshot(`${output}/pause-800.png`); await b.click('[data-testid="race-resume"]');
  await submit(s.question);
  await wait(async () => (await state()).motion?.kind === 'shortcut');
  s = await state();
  const cameraBefore = await transform('[data-testid="camera-world"]');
  await sleep(120);
  check(cameraBefore !== await transform('[data-testid="camera-world"]'), 'Camera continuously follows the sprite through the shortcut');
  await freeze(['[data-testid="token-p-1"]', '[data-testid="camera-world"]']);
  await wait(async () => !(await state()).motion);
  s = await state();
  check(s.players[0].currentTileId === 'tile_8_mid' && s.players[0].pathHistory.join(',') === 'tile_0,tile_1,tile_2,tile_3,tile_4,tile_8_mid', 'Paused shortcut resumes once and preserves exact position and history');
  check(await b.evaluate(`!document.body.innerText.includes('NGÃ RẼ CHIẾN THUẬT') && !document.querySelector('[data-testid="choose-shortcut"]')`), 'Automatic shortcut never asks for a route');
  await b.screenshot(`${output}/shortcut-800.png`);
  const humanCamera = await transform('[data-testid="camera-world"]');
  await wait(async () => { const s = await state(); return s.activePlayerIndex > 0 && s.gamePhase === 'moving'; });
  check(humanCamera !== await transform('[data-testid="camera-world"]'), 'Camera transitions to the bot on its next turn');
  await b.click('[data-testid="race-pause"]'); await b.click('[data-testid="race-exit"]');
  await wait(() => b.evaluate(`location.pathname==='/'`)); await sleep(800);
  check(b.exceptions.length === 0, 'Exit cleans up active animation and timers without runtime exceptions');
  await b.close(); b = await browserSession(800, 360);
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Math.random = () => 7 / 0xffffffff;' });
  await b.send('Page.navigate', { url: `${process.env.GAME_URL || 'http://localhost:8090'}/games/race-to-finish` });
  await wait(() => b.evaluate(`!!document.querySelector('[data-testid="start-race-button"]') && document.querySelector('[data-testid="start-race-button"]').getAttribute('aria-disabled') !== 'true'`));
  await b.click('[data-testid="start-race-button"]'); await wait(async () => !!await state() && !(await state()).isPaused);
  await b.click('[data-testid="roll-dice-button"]'); await wait(async () => (await state()).gamePhase === 'showing_question');
  await submit((await state()).question); await wait(async () => (await state()).gamePhase === 'rolling_mystery');
  await freeze(['[data-testid="mystery-reel-track"]', '[data-testid="camera-world"]']);
  await wait(async () => (await state()).gamePhase === 'mystery_result');
  const rewardStart = (await state()).players[0].position;
  check(await b.evaluate(`document.querySelector('[data-testid="mystery-winning-item"]').textContent === document.querySelector('[data-testid="mystery-result"]').textContent`), 'Paused reward reel resumes and announces the exact winning card');
  await freeze(['[data-testid="mystery-reel-track"]']);
  await wait(async () => (await state()).gamePhase === 'applying_effect');
  await freeze(['[data-testid="token-p-1"]', '[data-testid="camera-world"]']);
  await wait(async () => !(await state()).motion);
  check((await state()).players[0].position === rewardStart + 2, 'Reward movement resumes once and applies exactly two extra steps');
  await b.click('[data-testid="race-pause"]'); await b.click('[data-testid="race-exit"]');
  await wait(() => b.evaluate(`location.pathname==='/'`));
  check(b.exceptions.length === 0, 'Reward pause and cleanup have no runtime exceptions');
  await writeFile(`${output}/presentation-result.json`, JSON.stringify({ passed: true, platform: 'web CDP; not native Android', checks }, null, 2));
  console.log(`PASS: ${checks.length} mobile presentation checks`);
} catch (error) {
  await b.screenshot(`${output}/presentation-failure.png`);
  console.log(await state(), b.exceptions);
  await writeFile(`${output}/presentation-result.json`, JSON.stringify({ passed: false, checks, error: String(error) }, null, 2));
  throw error;
} finally { await b.close(); }
