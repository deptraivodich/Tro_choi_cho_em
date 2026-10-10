import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, sleep } from './lib/cdp.mjs';

const baseUrl = process.env.GAME_URL || 'http://localhost:8090';
const games = ['energy-defense', 'planet-rescue', 'terrain-racing', 'block-island', 'vault-code', 'floating-market', 'rhythm-bakery', 'treasure-dive', 'royal-artillery'];
const session = await browserSession(390, 844);
const passed = [];
try {
  for (const game of games) {
    await session.send('Page.navigate', { url: baseUrl });
    for (let i = 0; i < 200 && !await session.evaluate(`!!document.querySelector('[data-testid="game-card-play-${game}"]')`); i++) await sleep(150);
    assert.ok(await session.click(`[data-testid="game-card-play-${game}"]`), `Lobby card ${game}`);
    for (let i = 0; i < 100 && !await session.evaluate(`location.pathname.endsWith('/${game}') && !!document.querySelector('[aria-label="Về sảnh"]')`); i++) await sleep(100);
    assert.ok(await session.evaluate(`location.pathname.endsWith('/${game}')`), `Navigation ${game}`);
    await sleep(800);
    const tutorialExit = await session.evaluate(`!!document.querySelector('[aria-label="Thoát về sảnh"]')`);
    assert.ok(await session.click(tutorialExit ? '[aria-label="Thoát về sảnh"]' : '[aria-label="Về sảnh"]'), `Exit ${game}`);
    for (let i = 0; i < 50 && !await session.evaluate(`location.pathname === '/'`); i++) await sleep(100);
    assert.ok(await session.evaluate(`location.pathname === '/'`), `Return to lobby ${game}`);
    assert.equal(session.exceptions.length, 0, `Runtime exceptions ${game}`);
    passed.push(game); console.log(`PASS: ${game} opens and returns to lobby`);
  }
  await mkdir('artifacts/navigation-e2e', { recursive: true });
  await writeFile('artifacts/navigation-e2e/result.json', JSON.stringify({ passed: true, games: passed }, null, 2));
} finally { await session.close(); }
