import { spawn } from 'child_process';
import fs from 'fs';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching headless Chrome for real pixel click test...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Tro_choi_cho_em\\.chrome-cdp-real',
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
    await send('Input.setIgnoreInputEvents', { ignore: false });

    console.log('Waiting 5s for page and modal to fully hydrate...');
    await sleep(5000);

    // Get Bounding Box of start button
    const boxRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[aria-label="start-race-button"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
        })()
      `,
      returnByValue: true,
    });
    console.log('Start Button Rect:', boxRes.result.value);

    const rect = boxRes.result.value;
    if (rect) {
      console.log('Dispatching real mouse click at:', rect.x, rect.y);
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: rect.x,
        y: rect.y,
        button: 'left',
        clickCount: 1,
      });
      await sleep(50);
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: rect.x,
        y: rect.y,
        button: 'left',
        clickCount: 1,
      });
    }

    await sleep(2500);

    // Capture board screenshot
    const boardShot = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\real_02_board.png', Buffer.from(boardShot.data, 'base64'));
    console.log('Saved real_02_board.png');

    // Get Bounding Box of Roll Dice button
    const rollBoxRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('[aria-label="roll-dice-button"]');
          if (!btn) return null;
          const r = btn.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        })()
      `,
      returnByValue: true,
    });
    console.log('Roll Button Rect:', rollBoxRes.result.value);

    const rollRect = rollBoxRes.result.value;
    if (rollRect) {
      console.log('Dispatching real click on Roll button at:', rollRect.x, rollRect.y);
      await send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: rollRect.x,
        y: rollRect.y,
        button: 'left',
        clickCount: 1,
      });
      await sleep(50);
      await send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: rollRect.x,
        y: rollRect.y,
        button: 'left',
        clickCount: 1,
      });
    }

    await sleep(400);
    const rollingShot = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\real_03_rolling.png', Buffer.from(rollingShot.data, 'base64'));
    console.log('Saved real_03_rolling.png');

    await sleep(4500);
    const afterShot = await send('Page.captureScreenshot');
    fs.writeFileSync('C:\\Tro_choi_cho_em\\real_04_after_turn.png', Buffer.from(afterShot.data, 'base64'));
    console.log('Saved real_04_after_turn.png');

    ws.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    chrome.kill();
  }
}

run();
