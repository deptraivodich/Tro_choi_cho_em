import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function browserSession(width, height, reducedMotion = false) {
  const profile = await mkdtemp(path.join(tmpdir(), 'race-ui-'));
  const executable = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const child = spawn(executable, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--no-first-run', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let launchError;
  child.on('error', error => { launchError = error; });
  let port;
  for (let i = 0; i < 100; i++) {
    if (launchError) throw launchError;
    try { port = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await sleep(100); }
  }
  if (!port) { child.kill(); throw new Error('Chrome did not open a debugging port'); }
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  ws.onmessage = message => {
    const result = JSON.parse(message.data);
    if (result.method === 'Runtime.exceptionThrown') exceptions.push(result.params.exceptionDetails.text + ': ' + (result.params.exceptionDetails.exception?.description || ''));
    const request = pending.get(result.id);
    if (request) {
      clearTimeout(request.timeout); pending.delete(result.id);
      if (result.error) request.reject(new Error(JSON.stringify(result.error))); else request.resolve(result.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    const timeout = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(requestId, { resolve, reject, timeout }); ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, mobile: true, deviceScaleFactor: 1 });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] });
  const click = async selector => {
    const point = await evaluate(`(async () => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element || element.getAttribute('aria-disabled') === 'true' || element.disabled) return null;
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      let rect = element.getBoundingClientRect();
      for (let i=0;i<12;i++) {
        await new Promise(resolve=>setTimeout(resolve,50));
        const next=element.getBoundingClientRect();
        if (Math.abs(next.x-rect.x)+Math.abs(next.y-rect.y)<0.2) { rect=next; break; }
        rect=next;
      }
      const viewport = window.visualViewport;
      return rect.width && rect.height ? {
        x: (rect.x + rect.width/2 - (viewport?.offsetLeft || 0)) * (viewport?.scale || 1),
        y: (rect.y + rect.height/2 - (viewport?.offsetTop || 0)) * (viewport?.scale || 1),
      } : null;
    })()`);
    if (!point) return false;
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1, radiusX: 1, radiusY: 1, force: 1 }] });
    await sleep(50);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return true;
  };
  const screenshot = async file => {
    await mkdir(path.dirname(file), { recursive: true });
    const result = await send('Page.captureScreenshot'); await writeFile(file, Buffer.from(result.data, 'base64'));
  };
  return { send, evaluate, click, screenshot, exceptions,
    close: async () => { try { await send('Browser.close'); } catch {} ws.close(); child.kill(); } };
}

// Read-only observation of the actual React store, without adding test APIs to the app.
export const observeRace = `(() => {
  const element = document.querySelector('[data-testid^="token-"]');
  if (!element) return null;
  const key = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
  let fiber = element[key];
  while (fiber) {
    let hook = fiber.memoizedState;
    for (let i = 0; hook && i < 100; i++, hook = hook.next) {
      const value = hook.memoizedState;
      if (value && typeof value.getSnapshot === 'function' && typeof value.startGame === 'function') return value.getSnapshot();
    }
    fiber = fiber.return;
  }
  return null;
})()`;
