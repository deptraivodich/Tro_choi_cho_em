import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-round36b',root=path.resolve(out+'/web-dist');
const report={platform:'Chrome production web; not native Android',checks:[],viewports:[],liveSpawns:[],errors:[]};
const q=id=>'[data-testid="'+id+'"]';
let b;
function check(name,value,details){report.checks.push({name,passed:!!value,details});assert.ok(value,name+': '+JSON.stringify(details));}
const server=http.createServer(async(req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}let data;try{data=await readFile(file);}catch{file=path.join(root,'index.html');data=await readFile(file);}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(500);res.end();}});
await mkdir(out+'/images',{recursive:true});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const locate='('+function(){let f=document.querySelector('[data-testid=energy-mode-selection]');f=f?.[Object.keys(f).find(k=>k.startsWith('__reactFiber$'))];while(f){for(const candidate of[f,f.alternate]){let h=candidate?.memoizedState,engine,clock;for(let i=0;h&&i<120;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.advanceTo==='function')engine=v;if(!clock&&v&&typeof v.get==='function'&&typeof v.set==='function'&&typeof v.get()==='number')clock=v;}if(engine){window.energyQA={engine,clock};return true;}}f=f.return;}return false;}.toString()+')()';

async function wait(e){const start=Date.now();while(Date.now()-start<20000){if(await b.evaluate(e))return;await sleep(25);}throw Error('Timeout '+e);}
async function open(mode='hard'){
 await b.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/games/energy-defense`});
 await wait('!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');assert.ok(await b.evaluate(locate));
 await b.click(q('energy-mode-'+mode));await b.click(q('energy-start'));
 await wait('!!document.querySelector('+JSON.stringify(q('energy-combat-viewport'))+')');
 await wait('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');
}

try {
 b=await browserSession(390,844);
 for(const [w,h] of [[390,844],[1440,1000]])for(const distance of (w<600?[25,330,560]:[25,330])) {
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:w<600,deviceScaleFactor:1});await open();
  await b.evaluate('('+function(distance){const c=window.energyQA.engine,s=c.getSnapshot();c.publish({enemies:[{id:901,type:'golem',speed:.7,hp:60,maxHp:60,bornAt:c.now-distance/.7*100,x:0,y:70}],spawned:s.waveTotal,processed:0,problem:{...s.problem,targetFraction:{num:1,den:1},targetDisplay:'1',targetNumeric:1,availablePieces:[{id:'qa-one',display:'1',fraction:{num:1,den:1},numericVal:1}]},selected:[]});window.energyQA.clock.set(c.now);}.toString()+')('+distance+')');
  await b.click(q('energy-crystal-qa-one'));
  const trace=b.evaluate(`new Promise(resolve=>{const rows=[],start=performance.now();function tick(t){const e=document.querySelector('[data-testid=energy-creep-901]'),i=document.querySelector('[data-testid=energy-impact]'),p=document.querySelector('[data-testid=energy-projectile]');if(e&&i){const a=e.getBoundingClientRect(),r=i.getBoundingClientRect();const marker=document.querySelector('[data-testid=energy-muzzle-anchor]').getBoundingClientRect(),flash=document.querySelector('[data-testid=energy-muzzle]').getBoundingClientRect();rows.push({muzzleError:Math.hypot(marker.x+marker.width/2-flash.x-flash.width/2,marker.y+marker.height/2-flash.y-flash.height/2),muzzleOpacity:+getComputedStyle(document.querySelector('[data-testid=energy-muzzle]')).opacity,ms:t-start,opacity:+getComputedStyle(i).opacity,flight:p?+getComputedStyle(p).opacity:0,error:Math.hypot(r.x+r.width/2-(a.x+a.width/2),r.y+r.height/2-(a.y+a.height*(228/256-.36)))});}if(t-start<1100)requestAnimationFrame(tick);else resolve(rows);}requestAnimationFrame(tick);})`);
  await b.click(q('energy-fire'));const rows=await trace,hits=rows.filter(r=>r.opacity>.1);const muzzleRows=rows.filter(r=>r.muzzleOpacity>.1);check(w+' muzzle flash follows real mouth through recoil '+distance,muzzleRows.length>0&&Math.max(...muzzleRows.map(r=>r.muzzleError))<.3,muzzleRows);check(w+' projectile renders at '+distance,rows.some(r=>r.flight>.1));check(w+' impact hits upright body at '+distance,hits.length>0&&Math.max(...hits.map(r=>r.error))<4,hits);check(w+' exactly one kill and score at '+distance,await b.evaluate('window.energyQA.engine.getSnapshot().kills===1&&window.energyQA.engine.getSnapshot().hp===100&&window.energyQA.engine.getSnapshot().score===25'));
  report.viewports.push({w,h,distance,maxImpactError:Math.max(...hits.map(r=>r.error)),trace:rows});
 }
 check('no runtime exceptions',b.exceptions.length===0,b.exceptions);
} finally {await writeFile(out+'/combat-regression.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length}));}
