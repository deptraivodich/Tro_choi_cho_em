import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, observeRace, sleep } from './lib/cdp.mjs';

const output = 'artifacts/race-round-2/web';
await mkdir(output, { recursive: true });
const b = await browserSession(800, 360), checks = [], motionFrames = [], bots = new Set(), botAnswers = [];
const check = (value, message) => { assert.ok(value, message); checks.push(message); };
const state = () => b.evaluate(observeRace);
async function wait(predicate, timeout = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await predicate()) return; await sleep(30); }
  throw new Error('Round 2 UI condition timed out');
}
async function answer(q, wrong = false) {
  if (q.choices) {
    const value = wrong ? q.choices.find(choice => choice !== q.answer) : q.answer;
    await b.evaluate(`(()=>{const e=Array.from(document.querySelectorAll('[role="button"]')).find(e=>e.textContent===${JSON.stringify(value)});e.setAttribute('data-answer','round2')})()`);
    await b.click('[data-answer="round2"]');
  } else {
    const value = wrong ? String(q.answer.n / q.answer.d + 1) : `${q.answer.n}/${q.answer.d}`;
    await b.evaluate(`(()=>{const e=document.querySelector('[data-testid="math-answer-input"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await sleep(70); await b.click('[data-testid="math-submit"]');
  }
}
const gait = id => b.evaluate(`getComputedStyle(document.querySelector('[data-testid="player-gait-${id}"]')).transform`);
try {
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: 'Math.random = () => 1 / 0xffffffff;' });
  await b.send('Page.navigate', { url: 'http://localhost:8090/games/race-to-finish' });
  await wait(() => b.evaluate(`!!document.querySelector('[data-testid="start-race-button"]') && document.querySelector('[data-testid="start-race-button"]').getAttribute('aria-disabled')!=='true'`));
  await b.click('[data-testid="race-setup-character-0-turtle"]');
  await b.click('[data-testid="race-setup-character-1-bunny"]');
  check(await b.evaluate(`document.querySelector('[data-testid="race-setup-name-1"]').value==='Thỏ Tím Máy' && document.querySelector('[data-testid="race-setup-name-2"]').value==='Cánh Cụt Máy' && document.querySelector('[data-testid="race-setup-name-3"]').value==='Cáo Con Máy'`), 'Character swaps update default names for every affected bot slot');
  // A user-supplied name belongs to the participant even when its character changes.
  await b.evaluate(`(()=>{const e=document.querySelector('[data-testid="race-setup-name-2"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'Bạn máy');e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await sleep(80);
  await b.click('[data-testid="race-setup-character-2-fox"]');
  check(await b.evaluate(`document.querySelector('[data-testid="race-setup-name-2"]').value==='Bạn máy' && document.querySelector('[data-testid="race-setup-name-3"]').value==='Cánh Cụt Máy'`), 'Explicit participant names survive swaps while automatic names follow characters');
  await b.screenshot(`${output}/setup-swapped-roster.png`);
  await b.click('[data-testid="start-race-button"]');
  await wait(async () => !!await state() && !(await state()).isPaused);
  check((await state()).players.map(p => p.character).join(',') === 'turtle,bunny,fox,penguin', 'Actual gameplay receives the selected four-character roster');
  await sleep(250);
  check(await b.evaluate(`Math.abs(new DOMMatrix(getComputedStyle(document.querySelector('[data-testid="camera-world"]')).transform).a-360/315)<.005`), 'Intro finishes at the wider shared gameplay zoom');
  await b.screenshot(`${output}/wider-camera-clean-avatars.png`);
  let questions = 0, lastQuestion = null, pausedGait = false, screenshotRabbit = false, lastBotAnswer = -1;
  const seenMotion = new Set(), seenTurn = new Set(), start = Date.now();
  while (Date.now() - start < 660000) {
    let s = await state();
    const active = s.players[s.activePlayerIndex];
    const identity = await b.evaluate(`(()=>{const e=document.querySelector('[data-testid="race-current-player"]');return {id:e.getAttribute('aria-label'),text:e.textContent}})()`);
    if (identity.id !== active.id || !identity.text.startsWith(active.name)) {
      await sleep(25); s = await state();
      const fresh = s.players[s.activePlayerIndex];
      check(await b.evaluate(`document.querySelector('[data-testid="race-current-player"]').getAttribute('aria-label')===${JSON.stringify(fresh.id)} && document.querySelector('[data-testid="race-current-player"]').textContent.startsWith(${JSON.stringify(fresh.name)})`), 'Rendered HUD stays synchronized after a React turn update');
      continue;
    }
    if (!seenTurn.has(active.id)) {
      seenTurn.add(active.id);
      check(identity.text.startsWith(active.name), `Current HUD is bound to ${active.character}: ${active.name}`);
    }
    if (active.isBot) bots.add(active.id);
    if (s.gamePhase === 'finished') break;
    if (s.gamePhase === 'ready_to_roll' && !active.isBot) await b.click('[data-testid="roll-dice-button"]');
    if (s.gamePhase === 'showing_question' && !active.isBot && s.question.key !== lastQuestion) {
      lastQuestion = s.question.key; questions++; await answer(s.question, questions === 2);
    }
    if (s.gamePhase === 'evaluating_answer' && active.isBot && s.actionId !== lastBotAnswer) {
      lastBotAnswer = s.actionId; botAnswers.push(s.answerCorrect);
    }
    if (s.gamePhase === 'evaluating_answer' && !active.isBot && s.answerCorrect === false)
      await b.click('[data-testid="math-understood"]');
    if (s.motion) {
      const kind = s.motion.kind, category = `${active.isBot ? 'bot' : 'human'}:${kind}:${s.motion.resolveTile}`;
      const before = await gait(active.id); await sleep(45); const after = await gait(active.id);
      if (before !== after) {
        seenMotion.add(category); motionFrames.push({ player: active.character, category, before, after });
      }
      if (!pausedGait && kind === 'shortcut') {
        await b.evaluate(`document.querySelector('[data-testid="race-pause"]').click()`);
        await wait(async () => (await state()).isPaused); await sleep(60);
        const frozenState = await state(), frozenGait = await gait(active.id);
        const frozenCamera = await b.evaluate(`getComputedStyle(document.querySelector('[data-testid="camera-world"]')).transform`);
        await sleep(650);
        check(JSON.stringify(await state()) === JSON.stringify(frozenState), 'Pause blocks shortcut engine callbacks');
        check(await gait(active.id) === frozenGait, 'Pause freezes the visible gait at its current frame');
        check(await b.evaluate(`getComputedStyle(document.querySelector('[data-testid="camera-world"]')).transform`) === frozenCamera, 'Pause freezes camera alongside gait');
        await b.screenshot(`${output}/shortcut-gait-paused.png`);
        await b.click('[data-testid="race-resume"]'); pausedGait = true;
      }
      if (!screenshotRabbit && active.character === 'bunny') {
        await b.screenshot(`${output}/rabbit-bot-full-feet.png`); screenshotRabbit = true;
      }
    }
    check(!('forkChoiceState' in s), 'Turn flow never restores manual shortcut selection');
    await sleep(60);
  }
  const final = await state();
  check(final.gamePhase === 'finished', 'A complete four-participant game reaches victory through actual UI');
  check(bots.size === 3 && seenTurn.size === 4, 'Observed HUD turns for all three bots and the human');
  check(pausedGait && screenshotRabbit, 'Observed a paused shortcut and the actual rabbit bot animation');
  check([...seenMotion].some(key => key.startsWith('human:forward')), 'Human steps have visible gait animation');
  check([...seenMotion].some(key => key.startsWith('bot:forward')), 'Bot steps have visible gait animation');
  check([...seenMotion].some(key => key.includes(':shortcut:')), 'Shortcut movement has repeated visible gait');
  check([...seenMotion].some(key => key.endsWith(':false') && !key.includes(':shortcut:')), 'Reward or penalty movement retains gait');
  check(botAnswers.length >= 5 && botAnswers.slice(0, 5).filter(Boolean).length === 4, 'This seeded game observes four correct results in its first five bot answers');
  await sleep(500); await b.screenshot(`${output}/four-player-victory.png`);
  await b.click('[data-testid="victory-exit"]'); await wait(() => b.evaluate(`location.pathname==='/'`));
  check(b.exceptions.length === 0, 'Full game and exit produce no web runtime exceptions');
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: true, platform: 'Chrome web touch emulation; not native Android', checks, questions, botAnswers, seenMotion: [...seenMotion], motionFrames }, null, 2));
  console.log(`PASS: ${checks.length} checks; ${questions} human questions; ${motionFrames.length} animated gait samples`);
} catch (error) {
  await b.screenshot(`${output}/failure.png`);
  await writeFile(`${output}/result.json`, JSON.stringify({ passed: false, checks, error: String(error), state: await state(), exceptions: b.exceptions, motionFrames }, null, 2));
  throw error;
} finally { await b.close(); }
