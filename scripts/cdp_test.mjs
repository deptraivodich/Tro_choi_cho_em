import { spawn } from 'child_process';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Starting headless Chrome on port 9222...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Tro_choi_cho_em\\.chrome-cdp',
    '--window-size=430,932',
    'http://localhost:8090/games/race-to-finish',
  ]);

  await sleep(2000);

  try {
    const targetsRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await targetsRes.json();
    console.log('Targets:', targets.map(t => t.url));
    const raceTarget = targets.find(t => t.url.includes('race-to-finish')) || targets[0];

    const ws = new WebSocket(raceTarget.webSocketDebuggerUrl);

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

    console.log('Waiting for setup modal...');
    await sleep(4000);

    const setupPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\game_01_setup_modal.png', Buffer.from(setupPic.data, 'base64'));
    console.log('Saved game_01_setup_modal.png');

    // Click "XUẤT PHÁT ĐUA NGAY"
    console.log('Finding and clicking XUẤT PHÁT ĐUA NGAY button...');
    const clickStartRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const allElements = Array.from(document.querySelectorAll('*'));
          const target = allElements.find(el => el.textContent && el.textContent.includes('XUẤT PHÁT ĐUA NGAY') && el.children.length === 0);
          if (target) {
            let clickable = target;
            while (clickable && clickable.getAttribute('role') !== 'button' && clickable.parentElement) {
              clickable = clickable.parentElement;
            }
            if (!clickable) clickable = target;
            clickable.click();
            clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked: ' + clickable.tagName + ' / role: ' + clickable.getAttribute('role');
          }
          return 'not found';
        })()
      `,
    });
    console.log('Click Start Result:', clickStartRes.result.value);

    // Wait 2s for Board
    await sleep(2000);

    const boardPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\game_02_board_ready.png', Buffer.from(boardPic.data, 'base64'));
    console.log('Saved game_02_board_ready.png');

    // Find and click "ĐỔ XÚC XẮC" button
    console.log('Finding and clicking ĐỔ XÚC XẮC button...');
    const clickRollRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const allElements = Array.from(document.querySelectorAll('*'));
          const target = allElements.find(el => el.textContent && el.textContent.includes('ĐỔ XÚC XẮC') && el.children.length === 0);
          if (target) {
            let clickable = target;
            while (clickable && clickable.getAttribute('role') !== 'button' && clickable.parentElement) {
              clickable = clickable.parentElement;
            }
            if (!clickable) clickable = target;
            clickable.click();
            clickable.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return 'clicked: ' + clickable.tagName;
          }
          return 'roll not found';
        })()
      `,
    });
    console.log('Click Roll Result:', clickRollRes.result.value);

    // Capture rolling
    await sleep(400);
    const rollingPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\game_03_rolling_dice.png', Buffer.from(rollingPic.data, 'base64'));
    console.log('Saved game_03_rolling_dice.png');

    // Wait for stepping, landing, and bot turn
    await sleep(4000);
    const afterTurnPic = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\game_04_bot_turn.png', Buffer.from(afterTurnPic.data, 'base64'));
    console.log('Saved game_04_bot_turn.png');

    ws.close();
  } catch (err) {
    console.error('Error during CDP test:', err);
  } finally {
    chrome.kill();
  }
}

run();
