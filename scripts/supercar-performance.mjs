import {browserSession,sleep} from './lib/cdp.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await browserSession(390,844);
try{
 await browser.send('Page.navigate',{url:'http://127.0.0.1:8093/games/terrain-racing'});
 await sleep(1200);
 await browser.evaluate(`(() => {window.frameIntervals=[];window.profiling=true;let last;
  const sample=t=>{if(last)window.frameIntervals.push(t-last);last=t;if(window.profiling)requestAnimationFrame(sample);};
  requestAnimationFrame(sample);})()`);
 await sleep(4300);await browser.click('[data-testid="supercar-answer-20"]');await sleep(9000);
 const metrics=await browser.evaluate(`(() => {window.profiling=false;const a=window.frameIntervals.slice(2).sort((a,b)=>a-b);
  return {frames:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],
   over25Ms:a.filter(v=>v>25).length,meanMs:a.reduce((a,b)=>a+b,0)/a.length};})()`);
 metrics.platform='Chrome headless mobile web, without screencast; NOT native Android/iOS';
 metrics.method='Browser requestAnimationFrame intervals while actual game chase, collapse, jump, police jump and transition run.';
 await writeFile('artifacts/supercar/acceptance/performance-web.json',JSON.stringify(metrics,null,2));
 console.log(JSON.stringify(metrics,null,2));
}finally{await browser.close();}
