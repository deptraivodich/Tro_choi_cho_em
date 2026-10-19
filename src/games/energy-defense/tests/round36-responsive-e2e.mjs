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
function fixture(distance=0){const {engine:c,clock}=window.energyQA;
 c.pause();c.publish({paused:false,enemies:['scout','slime','golem'].map((type,i)=>({id:701+i,type,speed:[1.3,1,.7][i],hp:[25,40,60][i],maxHp:[25,40,60][i],bornAt:c.now-[distance,Math.min(360,distance+100),Math.min(360,distance+200)][i]/[1.3,1,.7][i]*100,x:0,y:70})),spawned:c.getSnapshot().waveTotal,processed:0,shot:null});clock.set(c.now);
}
const metrics='('+function(){const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},get=id=>{const e=document.querySelector('[data-testid="'+id+'"]');return e?rect(e):null;};return{hud:get('energy-mobile-hud'),dock:get('energy-console'),world:get('energy-portrait-world'),castle:get('energy-citadel'),turret:get('energy-turret-base'),viewport:get('energy-combat-viewport'),creeps:[701,702,703].map(id=>get('energy-creep-'+id)),width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,gate:get('energy-spawn-gate'),road:document.querySelector('[data-testid=energy-road-centerline]').getAttribute('d')};}.toString()+')()';

function single(distance=0,count=1){const {engine:c,clock}=window.energyQA;const types=['scout','slime','golem'];c.publish({paused:false,enemies:Array.from({length:count},(_,i)=>{const type=types[i%3],speed=[1.3,1,.7][i%3];return{id:901+i,type,speed,hp:[25,40,60][i%3],maxHp:[25,40,60][i%3],bornAt:c.now-(count===1?distance:15+i*280/count)/speed*100,x:0,y:70};}),waveTotal:count,spawned:count,processed:0,shot:null,selected:[]});clock.set(c.now);}
const geometry='('+function(){const castle=document.querySelector('[data-testid=energy-citadel]'),road=document.querySelector('[data-testid=energy-road-centerline]'),r=castle.getBoundingClientRect(),s=document.querySelector('[data-testid=energy-spawn-gate]').getBoundingClientRect(),p=road.getPointAtLength(road.getTotalLength()),a=road.getPointAtLength(0),m=road.getScreenCTM(),convert=p=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f});return{door:{x:r.x+r.width*207/512,y:r.y+r.height*383/512},pathEnd:convert(p),spawn:{x:s.x+s.width*(document.querySelector('[data-testid=energy-portrait-world]')?560/1536:500/1254),y:s.y+s.width*(document.querySelector('[data-testid=energy-portrait-world]')?840/1536:866/1254)},pathStart:convert(a),castle:{x:r.x,y:r.y,width:r.width,height:r.height},portal:{x:s.x,y:s.y,width:s.width,height:s.height},opaqueFill:document.querySelector('[data-testid=energy-portal-opaque-core]').getAttribute('fill'),opaqueOpacity:document.querySelector('[data-testid=energy-portal-opaque-core]').getAttribute('opacity'),bigOval:Array.from(castle.querySelectorAll('div')).filter(e=>getComputedStyle(e).backgroundColor==='rgba(11, 45, 37, 0.3)').length};}.toString()+')()';
async function crop(name,r,pad=14){const clip={x:Math.max(0,r.x-pad),y:Math.max(0,r.y-pad),width:r.width+pad*2,height:r.height+pad*2,scale:3};const shot=await b.send('Page.captureScreenshot',{format:'png',clip});await writeFile(out+'/images/'+name+'.png',Buffer.from(shot.data,'base64'));}
try {
 b=await browserSession(390,844);b.onEvent('Runtime.consoleAPICalled',e=>{if(e.type==='error')report.errors.push(e.args.map(a=>a.description||a.value).join(' '));});
 for(const [w,h] of [[320,640],[360,640],[390,844],[412,915],[768,1024],[1440,1000]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:w<600,deviceScaleFactor:1});await open();await b.evaluate('('+fixture.toString()+')(40)');await sleep(160);
  const m=await b.evaluate(metrics),g=await b.evaluate(geometry);report.viewports.push({w,h,...m,geometry:g});
  check(w+' path endpoint equals actual door threshold',Math.hypot(g.door.x-g.pathEnd.x,g.door.y-g.pathEnd.y)<.05,g);
  check(w+' portal floor equals actual spawn',Math.hypot(g.spawn.x-g.pathStart.x,g.spawn.y-g.pathStart.y)<.05,g);
  check(w+' black oval removed at source',g.bigOval===0,g.bigOval);
  check(w+' portal opaque backing does not fade',g.opaqueFill==='#3B145A'&&g.opaqueOpacity==='1',g);
  const artSize=await b.evaluate("(()=>{const a=document.querySelector('[data-testid=energy-portal-art]').getBoundingClientRect(),p=document.querySelector('[data-testid=energy-spawn-gate]').getBoundingClientRect();return{aw:a.width,ah:a.height,pw:p.width,ph:p.height};})()");check(w+' portal bitmap fits its anchored frame',Math.abs(artSize.aw-artSize.pw)<.1&&Math.abs(artSize.ah-artSize.ph)<.1,artSize);
  check(w+' no horizontal overflow',m.width<=w,m.width);
  if(w<600){check(w+' no page scrolling',m.height<=h,m.height);check(w+' buildings and enemies clear HUD/dock',[m.castle,m.turret,...m.creeps].every(r=>r.y>=m.hud.bottom&&r.bottom<=m.dock.y),m);}
  await b.screenshot(out+'/images/'+w+'x'+h+'.png');
  const band1=await b.evaluate("document.querySelector('[data-testid=energy-portal-bands]').getAttribute('d')");await sleep(200);const band2=await b.evaluate("document.querySelector('[data-testid=energy-portal-bands]').getAttribute('d')");check(w+' energy bands move',band1!==band2);report.portalMotion.push({w,band1,band2});
  for(const d of (w<600?[0,5,11,13,25,70,140,170,230,290,330,350,365,450,560,579]:[0,5,11,13,25,70,140,170,230,290,330,350,365])){
   await b.evaluate('('+single.toString()+')('+d+')');await sleep(40);
   const row=await b.evaluate(`(()=>{const c=document.querySelector('[data-testid=energy-creep-901]'),p=document.querySelector('[data-testid=energy-creep-pose-901]'),s=document.querySelector('[data-testid=energy-creep-shadow-901]'),r=c.getBoundingClientRect(),q=s.getBoundingClientRect();return{d:${d},pose:getComputedStyle(p).transform,z:+getComputedStyle(c).zIndex,foot:{x:r.x+r.width/2,y:r.y+r.height*228/256},shadow:{x:q.x+q.width/2,y:q.y+q.height/2}};})()`);
   check(w+' upright '+d,/^matrix\(1, 0, 0, 1,/.test(row.pose),row);
   check(w+' shadow still under feet '+d,Math.abs(row.foot.x-row.shadow.x)<.1&&Math.abs(row.foot.y-row.shadow.y)<1,row);
   if(d>=25)check(w+' spatial portal depth '+d,row.z===(w<600?3:1),row);
  }
  if(w===390){
   await b.evaluate('('+single.toString()+')(0)');await sleep(20);await crop('portal-three-pillars',g.portal);await b.screenshot(out+'/images/enemy-emergence.png');
   await b.evaluate('('+single.toString()+')(570)');await sleep(35);await crop('castle-approach',g.castle,28);
   await open();await sleep(150);const clean=await b.evaluate(geometry);await crop('castle-no-oval',clean.castle,25);await crop('door-road-junction',clean.castle,20);
   // Diagnostic overlay only in this one evidence image, never in application code.
   await b.evaluate('('+function(g){const e=document.createElement('div');e.id='qa-anchor-cross';e.style.cssText=`position:fixed;left:${g.door.x-4}px;top:${g.door.y-4}px;width:8px;height:8px;border:1px solid #eb52bd;border-radius:50%;z-index:99999;pointer-events:none`;document.body.append(e);}.toString()+')('+JSON.stringify(clean)+')');await crop('door-endpoint-proof',clean.castle,20);await b.evaluate("document.querySelector('#qa-anchor-cross').remove()");
  }
 }
 check('no runtime exceptions',b.exceptions.length===0,b.exceptions);
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(out+'/images/failure.png').catch(()=>{});throw error;}
finally{await writeFile(out+'/responsive-regression.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,error:report.error}));}
