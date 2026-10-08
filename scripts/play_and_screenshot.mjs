import { spawn } from 'child_process';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching headless Chrome...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Tro_choi_cho_em\\.chrome-cdp-play2',
    '--window-size=430,932',
    'http://localhost:8090/games/race-to-finish',
  ]);

  await sleep(4000);

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    const target = targets.find(t => t.url.includes('race-to-finish')) || targets[0];

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

    console.log('Waiting for Setup Modal render...');
    await sleep(3000);

    // Capture Setup Modal
    const setupPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\final_01_setup_modal.png', Buffer.from(setupPic.data, 'base64'));
    console.log('Saved final_01_setup_modal.png');

    // Click Start Race Button via accessibility label
    console.log('Clicking start-race-button...');
    const clickStart = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[aria-label="start-race-button"]');
          if (btn) {
            btn.click();
            return 'clicked_start_successfully';
          }
          return 'start_btn_not_found';
        })()
      `,
    });
    console.log('Start Button Click Result:', clickStart.result.value);

    // Wait 2s for Game Board to render
    await sleep(2000);
    const boardPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\final_02_game_board.png', Buffer.from(boardPic.data, 'base64'));
    console.log('Saved final_02_game_board.png');

    // Click Roll Dice Button
    console.log('Clicking roll-dice-button...');
    const clickRoll = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[aria-label="roll-dice-button"]');
          if (btn) {
            btn.click();
            return 'clicked_roll_successfully';
          }
          return 'roll_btn_not_found';
        })()
      `,
    });
    console.log('Roll Button Click Result:', clickRoll.result.value);

    // Capture while rolling
    await sleep(350);
    const rollingPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\final_03_rolling_dice.png', Buffer.from(rollingPic.data, 'base64'));
    console.log('Saved final_03_rolling_dice.png');

    // Wait 4s for character stepping and bot turn
    await sleep(4000);
    const afterRollPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\final_04_movement_and_turn.png', Buffer.from(afterRollPic.data, 'base64'));
    console.log('Saved final_04_movement_and_turn.png');

    // Click back button in header
    console.log('Clicking Header Back Button...');
    const clickBack = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const backBtn = document.querySelector('[aria-label*="sảnh"], [aria-label*="quay lại"], [aria-label="Về sảnh trò chơi"]');
          if (backBtn) {
            backBtn.click();
            return 'clicked_header_back';
          }
          const allBtns = Array.from(document.querySelectorAll('div[role="button"]'));
          if (allBtns.length > 0) {
            allBtns[0].click();
            return 'clicked_first_btn';
          }
          return 'back_btn_not_found';
        })()
      `,
    });
    console.log('Back Button Click Result:', clickBack.result.value);

    await sleep(1500);
    const lobbyPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\final_05_verified_lobby.png', Buffer.from(lobbyPic.data, 'base64'));
    console.log('Saved final_05_verified_lobby.png');

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chrome.kill();
  }
}

run();
