import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-round36',root=path.resolve(out+'/web-dist');
const report={platform:'Chrome production web; not native Android',checks:[],viewports:[],liveSpawns:[],errors:[],performance:[],portalMotion:[]};
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
 b=await browserSession(390,844);await open();
 // Pause the real clock; hide only the modal in this diagnostic screenshot fixture.
 await b.evaluate("window.energyQA.engine.pause()");await sleep(100);
 report.frames=[];
 for(const d of [0,1,2,3,4,6,8,12,18]) {
  await b.evaluate('('+function(d){const c=window.energyQA.engine;c.publish({paused:true,enemies:[{id:901,type:'golem',speed:.7,hp:60,maxHp:60,bornAt:c.now-d/.7*100,x:0,y:70}],spawned:5});}.toString()+')('+d+')');await sleep(100);
  await b.evaluate("document.querySelector('[data-testid=energy-dialog]').style.visibility='hidden';window.energyQA.clock.set(window.energyQA.engine.now)");await sleep(40);
  report.frames.push(await b.evaluate("(()=>{const e=document.querySelector('[data-testid=energy-creep-901]');return{d:"+d+",z:+getComputedStyle(e).zIndex,transform:e.style.transform};})()"));
  check('no pause modal over evidence '+d,await b.evaluate("getComputedStyle(document.querySelector('[data-testid=energy-dialog]')).visibility==='hidden'"));
  await b.screenshot(out+'/images/occlusion-'+d+'.png');
 }
 await b.evaluate('('+function(){const c=window.energyQA.engine;c.publish({paused:true,enemies:[{id:901,type:'golem',speed:.7,hp:60,maxHp:60,bornAt:c.now,x:0,y:70}],spawned:5});}.toString()+')()');await sleep(100);
 await b.evaluate("document.querySelector('[data-testid=energy-dialog]').style.visibility='hidden';window.energyQA.clock.set(window.energyQA.engine.now)");await sleep(40);
 // Forced overlap of ONE real sprite with the middle plinth tests compositing in isolation.
 // This DOM-only diagnostic is not a gameplay path or a production hook.
 await b.evaluate("(()=>{const e=document.querySelector('[data-testid=energy-creep-901]');e.style.transform+=' translateX(35px)';})()");
 await b.screenshot(out+'/images/occlusion-forced-with-front.png');
 await b.evaluate("document.querySelector('[data-testid=energy-creep-901]').style.visibility='hidden'");await b.screenshot(out+'/images/occlusion-forced-base.png');await b.evaluate("document.querySelector('[data-testid=energy-creep-901]').style.visibility='visible'");
 await b.evaluate("document.querySelector('[data-testid=energy-portal-front]').style.visibility='hidden'");await b.screenshot(out+'/images/occlusion-forced-without-front.png');
 check('one sprite in forced-overlap diagnostic',await b.evaluate("document.querySelectorAll('[data-testid=energy-creep-901]').length===1"));
 check('no runtime exceptions',b.exceptions.length===0,b.exceptions);
}finally{await writeFile(out+'/occlusion-regression.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
