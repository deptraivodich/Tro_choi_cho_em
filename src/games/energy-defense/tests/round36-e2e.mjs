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
function liveShot(){const c=window.energyQA.engine,s=c.getSnapshot();c.publish({problem:{...s.problem,targetFraction:{num:1,den:1},targetDisplay:'1',targetNumeric:1,availablePieces:[{id:'qa-one',display:'1',fraction:{num:1,den:1},numericVal:1}]},selected:[]});}
const metrics='('+function(){const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},get=id=>{const e=document.querySelector('[data-testid="'+id+'"]');return e?rect(e):null;};return{hud:get('energy-mobile-hud'),dock:get('energy-console'),world:get('energy-portrait-world'),castle:get('energy-citadel'),turret:get('energy-turret-base'),viewport:get('energy-combat-viewport'),creeps:[701,702,703].map(id=>get('energy-creep-'+id)),width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,gate:get('energy-spawn-gate'),road:document.querySelector('[data-testid=energy-road-centerline]').getAttribute('d')};}.toString()+')()';

function single(distance=0,count=1){const {engine:c,clock}=window.energyQA;const types=['scout','slime','golem'];c.publish({paused:false,enemies:Array.from({length:count},(_,i)=>{const type=types[i%3],speed=[1.3,1,.7][i%3];return{id:901+i,type,speed,hp:[25,40,60][i%3],maxHp:[25,40,60][i%3],bornAt:c.now-(count===1?distance:15+i*280/count)/speed*100,x:0,y:70};}),waveTotal:count,spawned:count,processed:0,shot:null,selected:[]});clock.set(c.now);}
const geometry='('+function(){const castle=document.querySelector('[data-testid=energy-citadel]'),road=document.querySelector('[data-testid=energy-road-centerline]'),r=castle.getBoundingClientRect(),s=document.querySelector('[data-testid=energy-spawn-gate]').getBoundingClientRect(),p=road.getPointAtLength(road.getTotalLength()),a=road.getPointAtLength(0),m=road.getScreenCTM(),convert=p=>({x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f});return{door:{x:r.x+r.width*207/512,y:r.y+r.height*383/512},pathEnd:convert(p),spawn:{x:s.x+s.width*(document.querySelector('[data-testid=energy-portrait-world]')?560/1536:500/1254),y:s.y+s.width*(document.querySelector('[data-testid=energy-portrait-world]')?840/1536:866/1254)},pathStart:convert(a),castle:{x:r.x,y:r.y,width:r.width,height:r.height},portal:{x:s.x,y:s.y,width:s.width,height:s.height},opaqueFill:document.querySelector('[data-testid=energy-portal-opaque-core]').getAttribute('fill'),opaqueOpacity:document.querySelector('[data-testid=energy-portal-opaque-core]').getAttribute('opacity'),bigOval:Array.from(castle.querySelectorAll('div')).filter(e=>getComputedStyle(e).backgroundColor==='rgba(11, 45, 37, 0.3)').length};}.toString()+')()';
async function crop(name,r,pad=14){const clip={x:Math.max(0,r.x-pad),y:Math.max(0,r.y-pad),width:r.width+pad*2,height:r.height+pad*2,scale:3};const shot=await b.send('Page.captureScreenshot',{format:'png',clip});await writeFile(out+'/images/'+name+'.png',Buffer.from(shot.data,'base64'));}
async function timing(ms=1800){return b.evaluate(`new Promise(resolve=>{const rows=[],start=performance.now();let previous=start;function tick(t){rows.push(t-previous);previous=t;if(t-start<${ms})requestAnimationFrame(tick);else{const sorted=rows.slice(2).sort((a,b)=>a-b);resolve({samples:sorted.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],over50:sorted.filter(n=>n>50).length,mean:sorted.reduce((a,b)=>a+b,0)/sorted.length});}}requestAnimationFrame(tick);})`);}
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
 // Frame-by-frame emergence fixture: same renderer, no production test hooks.
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await open();
 report.occlusion=[];
 for(const d of [0,1,2,3,4,6,8,12,18]){
  await b.evaluate('('+single.toString()+')('+d+')');
  await b.evaluate("(()=>{const c=window.energyQA.engine,s=c.getSnapshot();c.publish({enemies:s.enemies.map(e=>({...e,type:'golem',speed:.7,bornAt:c.now-"+d+"/.7*100,hp:60,maxHp:60}))});c.pause();window.energyQA.clock.set(c.now);})()");await sleep(80);
  const g=await b.evaluate(geometry),frame=await b.evaluate("(()=>{const e=document.querySelector('[data-testid=energy-creep-901]'),r=e.getBoundingClientRect();return{z:+getComputedStyle(e).zIndex,box:{x:r.x,y:r.y,width:r.width,height:r.height},count:document.querySelectorAll('[data-testid=energy-creep-901]').length};})()");
  check('one golem during emergence '+d,frame.count===1,frame);report.occlusion.push({d,...frame,portal:g.portal});
  await b.evaluate("document.querySelector('[data-testid=energy-dialog]').style.visibility='hidden'");
  await b.screenshot(out+'/images/occlusion-'+d+'.png');
  if(d===0){await b.evaluate("document.querySelector('[data-testid=energy-creep-901]').style.visibility='hidden'");await b.screenshot(out+'/images/occlusion-base.png');await b.evaluate("document.querySelector('[data-testid=energy-creep-901]').style.visibility='visible'");await b.evaluate("document.querySelector('[data-testid=energy-portal-front]').style.visibility='hidden'");await b.screenshot(out+'/images/occlusion-without-front-diagnostic.png');await b.evaluate("document.querySelector('[data-testid=energy-portal-front]').style.visibility='visible'");}
 }
 // Pause must freeze bands and spawn response because everything observes the same clock.
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await open();await sleep(400);await b.click('[aria-label="T\u1ea1m d\u1eebng"]');await sleep(140);
 const paused=await b.evaluate("({clock:window.energyQA.clock.get(),d:document.querySelector('[data-testid=energy-portal-bands]').getAttribute('d')})");await sleep(500);check('pause freezes portal and spawn',await b.evaluate('window.energyQA.clock.get()')===paused.clock&&await b.evaluate("document.querySelector('[data-testid=energy-portal-bands]').getAttribute('d')")===paused.d&&await b.evaluate('window.energyQA.engine.getSnapshot().spawned')===0);await b.click(q('energy-resume'));
 for(const count of [3,5,10,25]){await open();await b.evaluate('('+single.toString()+')(0,'+count+')');const stats=await timing(2200);report.performance.push({count,portalActive:true,...stats});check(count+' enemy stress: entities preserved',await b.evaluate('window.energyQA.engine.getSnapshot().enemies.length')===count);await b.screenshot(out+'/images/stress-'+count+'.png');console.log('performance '+count+' '+JSON.stringify(stats));}
 // Uninterrupted real-time 1x capture. Seed enemy kinds and one answer fixture; no injected entities or clock jumps.
 await open();await b.evaluate("(()=>{const c=window.energyQA.engine;let i=0;c.random=()=>[0,.4,.9][i++%3];window.liveRows=[];window.hpRows=[];window.motionRows=[];let prevSample=0;const sample=()=>{const t=c.now;if(t-prevSample>80){prevSample=t;window.motionRows.push({t,creeps:[...document.querySelectorAll('[data-testid^=energy-creep-]')].filter(e=>/^energy-creep-[0-9]+$/.test(e.dataset.testid)).map(e=>({id:e.dataset.testid,transform:e.style.transform,z:e.style.zIndex}))});}if(c.getSnapshot().status==='running')requestAnimationFrame(sample);};requestAnimationFrame(sample);const seen=new Set();let hp=100;c.subscribe(()=>{const s=c.getSnapshot();for(const e of s.enemies)if(!seen.has(e.id)){seen.add(e.id);window.liveRows.push({id:e.id,type:e.type,bornAt:e.bornAt,observedClock:window.energyQA.clock.get(),wall:performance.now()});}if(hp!==s.hp){hp=s.hp;window.hpRows.push({clock:c.now,hp,remaining:s.enemies.map(e=>e.id),processed:s.processed});}});})()");
 await mkdir(out+'/video-frames',{recursive:true});const events=[],writes=[];const off=b.onEvent('Page.screencastFrame',e=>{const file=String(events.length).padStart(5,'0')+'.jpg';events.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(out+'/video-frames/'+file,Buffer.from(e.data,'base64')));return b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
 await b.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:390,maxHeight:844,everyNthFrame:3});const stamp=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get()})');
 const start=Date.now();let next=0,saved=false,fired=false;
 while(Date.now()-start<100000){await sleep(120);const elapsed=Date.now()-start;if(!fired&&elapsed>20000){await b.evaluate('('+liveShot.toString()+')()');await b.click(q('energy-crystal-qa-one'));await b.click(q('energy-fire'));fired=true;}if(elapsed>=next){console.log('1x portal recording '+Math.floor(elapsed/1000)+'s');next+=10000;}if(!saved&&await b.evaluate('window.energyQA.clock.get()>2150')){const g=await b.evaluate(geometry);await crop('portal-spawn-live',g.portal,20);await b.screenshot(out+'/images/spawn-live-fullscreen.png');saved=true;}}
 const end=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get(),rows:window.liveRows,hp:window.hpRows,state:window.energyQA.engine.getSnapshot()})');report.liveSpawns=end.rows;report.arrivals=end.hp;await writeFile(out+'/motion-samples.json',JSON.stringify(await b.evaluate('window.motionRows')));
 check('unchanged first-wave spawn schedule',end.rows.slice(0,5).map(r=>r.bornAt).join(',')==='2000,5500,9000,12500,16000',end.rows);
 check('one UI shot kills one; four castle arrivals subtract 15 HP exactly once',end.state.hp===40&&end.state.wave===2&&end.state.kills===1&&end.hp.map(r=>r.hp).join(',')==='85,70,55,40',end.hp);
 check('first wave entities do not survive behind castle',end.state.enemies.every(e=>e.id>5),end.state.enemies);
 check('recording clock is 1x real time',Math.abs((end.wall-stamp.wall)-(end.clock-stamp.clock))<(end.wall-stamp.wall)*.01,{wall:end.wall-stamp.wall,clock:end.clock-stamp.clock});
 await b.send('Page.stopScreencast');off();await Promise.all(writes);await writeFile(out+'/video-frames/timestamps.json',JSON.stringify(events));report.recording={...stamp,end:{wall:end.wall,clock:end.clock},seconds:events.at(-1).timestamp-events[0].timestamp,frames:events.length,speed:'1x actual gameplay clock; seeded kinds and one answer fixture; no injected entities or clock jumps',audio:false,platform:'Chrome production Web; not native'};
 await b.screenshot(out+'/images/after-all-castle-arrivals.png');check('no runtime exceptions',b.exceptions.length===0,b.exceptions);check('no console errors',report.errors.length===0,report.errors);
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(out+'/images/failure.png').catch(()=>{});throw error;}
finally{await writeFile(out+'/web-report.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,error:report.error}));}
