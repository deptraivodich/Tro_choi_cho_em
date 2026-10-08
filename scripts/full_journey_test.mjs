import { spawn } from 'child_process';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting full journey test from Lobby...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Tro_choi_cho_em\\.chrome-cdp-journey',
    '--window-size=430,932',
    'http://localhost:8090/',
  ]);

  await sleep(4000);

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    console.log('Available targets:', targets.map(t => `${t.type}: ${t.url}`));
    const target = targets.find(t => t.url.includes('localhost:8090') && t.type === 'page') || targets.find(t => t.type === 'page');
    console.log('Connected to target:', target.url);

    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((res) => ws.onopen = res);

    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Input.setIgnoreInputEvents', { ignore: false });

    console.log('Waiting 5s for Lobby to load...');
    await sleep(5000);

    // 1. Screenshot Lobby
    const lobbyPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\journey_01_lobby.png', Buffer.from(lobbyPic.data, 'base64'));
    console.log('Saved journey_01_lobby.png');

    // 2. Click "Đua Về Đích" card
    console.log('Finding and clicking Đua Về Đích card in lobby...');
    const clickCardRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const els = Array.from(document.querySelectorAll('*'));
          const raceTitle = els.find(e => (e.innerText || e.textContent || '').trim() === 'Đua Về Đích');
          if (raceTitle) {
            let card = raceTitle;
            while (card && card.getAttribute('role') !== 'button' && card.parentElement) {
              card = card.parentElement;
            }
            if (!card) card = raceTitle;
            card.click();
            card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked_race_card';
          }
          return 'race_card_not_found';
        })()
      `,
    });
    console.log('Click Card Result:', clickCardRes.result.value);

    // Wait 3s for route navigation & Setup Modal
    await sleep(3500);

    // 3. Screenshot Setup Modal
    const setupPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\journey_02_setup_modal.png', Buffer.from(setupPic.data, 'base64'));
    console.log('Saved journey_02_setup_modal.png');

    // 4. Click "XUẤT PHÁT ĐUA NGAY"
    console.log('Clicking XUẤT PHÁT ĐUA NGAY button...');
    const clickStartRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[aria-label="start-race-button"], [data-testid="start-race-button"]');
          if (btn) {
            btn.click();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked_start_by_selector';
          }
          const allEls = Array.from(document.querySelectorAll('*'));
          const fallback = allEls.find(e => (e.innerText || e.textContent || '').includes('XUẤT PHÁT ĐUA NGAY'));
          if (fallback) {
            fallback.click();
            return 'clicked_start_fallback';
          }
          return 'start_not_found';
        })()
      `,
    });
    console.log('Click Start Result:', clickStartRes.result.value);

    // Wait 2.5s for Board render
    await sleep(2500);

    // 5. Screenshot Game Board
    const boardPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\journey_03_game_board.png', Buffer.from(boardPic.data, 'base64'));
    console.log('Saved journey_03_game_board.png');

    // 6. Click "ĐỔ XÚC XẮC" button
    console.log('Clicking ĐỔ XÚC XẮC button...');
    const clickRollRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[aria-label="roll-dice-button"], [data-testid="roll-dice-button"]');
          if (btn) {
            btn.click();
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked_roll_by_selector';
          }
          const allEls = Array.from(document.querySelectorAll('*'));
          const fallback = allEls.find(e => (e.innerText || e.textContent || '').includes('ĐỔ XÚC XẮC'));
          if (fallback) {
            fallback.click();
            return 'clicked_roll_fallback';
          }
          return 'roll_not_found';
        })()
      `,
    });
    console.log('Click Roll Result:', clickRollRes.result.value);

    // 7. Capture Rolling state
    await sleep(350);
    const rollingPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\journey_04_rolling.png', Buffer.from(rollingPic.data, 'base64'));
    console.log('Saved journey_04_rolling.png');

    // 8. Wait 4s for character stepping and bot response
    await sleep(4000);
    const afterRollPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\journey_05_moved.png', Buffer.from(afterRollPic.data, 'base64'));
    console.log('Saved journey_05_moved.png');

    // 9. Click Back button to return to Lobby
    console.log('Clicking Back button in header...');
    const clickBackRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const backBtn = document.querySelector('[aria-label*="sảnh"], [aria-label*="quay lại"], [aria-label="Về sảnh trò chơi"]');
          if (backBtn) {
            backBtn.click();
            return 'clicked_back_by_aria';
          }
          const btns = Array.from(document.querySelectorAll('div[role="button"]'));
          if (btns.length > 0) {
            btns[0].click();
            return 'clicked_first_button';
          }
          return 'back_not_found';
        })()
      `,
    });
    console.log('Click Back Result:', clickBackRes.result.value);

    // Wait 2s for return to lobby
    await sleep(2000);
    const returnLobbyPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\journey_06_returned_lobby.png', Buffer.from(returnLobbyPic.data, 'base64'));
    console.log('Saved journey_06_returned_lobby.png');

    ws.close();
  } catch (err) {
    console.error('Error in journey test:', err);
  } finally {
    chrome.kill();
  }
}

run();
