import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { browserSession } from './lib/cdp.mjs';

const root = path.resolve('docs/references/supercar-handoff/Sieu_Xe_DEV_HANDOFF');
const output = path.resolve('artifacts/supercar/reference');
await mkdir(output, { recursive: true });
const browser = await browserSession(540,960);
try {
  const results = [];
  for (const file of ['index.html','Sieu_Xe_Hoat_Anh_2D.html']) {
    await browser.send('Page.navigate',{url:pathToFileURL(path.join(root,'05_prototype',file)).href+'?capture=1'});
    for(let i=0;i<100;i++){if(await browser.evaluate('!!window.ready'))break;await new Promise(r=>setTimeout(r,50));}
    await browser.evaluate('window.ready');
    const checks = await browser.evaluate(`(() => {
      const a=window.animation; const phases=[];a.reset();
      for(let i=0;i<10000;i++) { const s=a.state();if(phases.at(-1)!==s.phase+'-'+s.stage)phases.push(s.phase+'-'+s.stage);
        if(s.phase==='question')a.choose(a.correct());
        if(s.phase==='victory')break;a.step(1/120,false);
      }
      const win={state:a.state(),world:a.world()};
      a.reset();a.step(3.4,false);a.choose(10);a.step(5,false);const low=a.state();
      a.reset();a.step(3.4,false);a.choose(30);a.step(5,false);const high=a.state();
      a.reset();a.step(1,false);a.setPause(true);const before=JSON.stringify(a.world());a.step(10,false);
      const pause=before===JSON.stringify(a.world());
      return {phases,win,low,high,pause};
    })()`);
    results.push({file,...checks});
    await browser.screenshot(path.join(output,file.replace('.html','')+'-tested.png'));
  }
  await writeFile(path.join(output,'prototype-tested.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(r=>({file:r.file,win:r.win.state,low:r.low.phase,high:r.high.phase,pause:r.pause})),null,2));
} finally { await browser.close(); }
