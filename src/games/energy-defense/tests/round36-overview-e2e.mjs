import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { Buffer } from 'node:buffer';
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
try{
 b=await browserSession(390,844);await open();await sleep(2300);
 await b.screenshot(out+'/images/mobile-overview-live.png');
 const r=await b.evaluate("(()=>{const r=document.querySelector('[data-testid=energy-turret-base]').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})()");
 const shot=await b.send('Page.captureScreenshot',{format:'png',clip:{x:r.x-40,y:r.y-45,width:r.width+80,height:r.height+90,scale:3}});
 await writeFile(out+'/images/turret-middle-left.png',Buffer.from(shot.data,'base64'));
 check('real live overview has no runtime exception',b.exceptions.length===0,b.exceptions);
}finally{if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
