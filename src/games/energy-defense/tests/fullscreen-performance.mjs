import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { browserSession, sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-mobile-fullscreen';
function serve(root){return http.createServer(async(req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}let data;try{data=await readFile(file);}catch{file=path.join(root,'index.html');data=await readFile(file);}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(500);res.end();}});}
const servers=[serve(path.resolve(out+'/before-web')),serve(path.resolve(out+'/web-dist'))];
for(const s of servers)await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
let b;
const rows=[];
async function wait(e){const start=Date.now();while(Date.now()-start<20000){if(await b.evaluate(e))return;await sleep(30);}throw Error('Timed out '+e);}
try{
 b=await browserSession(390,844);
 for(const [w,h]of [[360,640],[390,844]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1});
  for(const variant of [0,1,1,0]){
   await b.send('Page.navigate',{url:`http://127.0.0.1:${servers[variant].address().port}/games/energy-defense`});await wait('!!document.querySelector("[data-testid=energy-mode-selection]")');
   await b.click('[data-testid=energy-mode-hard]');await b.click('[data-testid=energy-start]');await wait('!!document.querySelector("[data-testid=energy-combat-viewport]")');
   await wait('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');
   await b.evaluate('('+function(){let f=document.querySelector('[data-testid=energy-defense]');f=f[Object.keys(f).find(k=>k.startsWith('__reactFiber$'))];while(f){for(const a of[f,f.alternate]){let h=a?.memoizedState;for(let i=0;h&&i<120;i++,h=h.next){const c=h.memoizedState;if(c&&typeof c.getSnapshot==='function'&&typeof c.advanceTo==='function'){c.publish({enemies:['scout','slime','golem'].map((type,i)=>({id:701+i,type,speed:[1.3,1,.7][i],bornAt:c.now-[95,205,290][i]/[1.3,1,.7][i]*100,hp:[25,40,60][i],maxHp:[25,40,60][i],x:0,y:70})),spawned:c.getSnapshot().waveTotal,processed:0});return;}}}f=f.return;}throw Error('No controller');}.toString()+')()');
   const sample=await b.evaluate('new Promise(resolve=>{const deltas=[],start=performance.now();let last=start;function tick(t){if(t-start>200)deltas.push(t-last);last=t;if(t-start<3200)requestAnimationFrame(tick);else{const sorted=deltas.slice().sort((a,b)=>a-b);resolve({frames:sorted.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over50ms:sorted.filter(d=>d>50).length});}}requestAnimationFrame(tick);})');
   rows.push({variant:variant?'after':'before',width:w,height:h,...sample});console.log(JSON.stringify(rows.at(-1)));
  }
 }
 const result={platform:'Chrome headless production web, sequential before/after/after/before in one browser; not native FPS',scenario:'3 moving original enemy sprites, same distances and speeds; no recording or screenshots during samples',rows,exceptions:b.exceptions};
 await writeFile(out+'/performance-comparison.json',JSON.stringify(result,null,2));
}finally{if(b)await b.close();for(const s of servers){s.closeAllConnections();await new Promise(resolve=>s.close(resolve));}}
