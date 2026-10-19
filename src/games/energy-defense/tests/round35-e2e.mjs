import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-round35',root=path.resolve(out+'/web-dist');
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
function fixture(distance=0){const {engine:c,clock}=window.energyQA;
 c.pause();c.publish({paused:false,enemies:['scout','slime','golem'].map((type,i)=>({id:701+i,type,speed:[1.3,1,.7][i],hp:[25,40,60][i],maxHp:[25,40,60][i],bornAt:c.now-[distance,Math.min(360,distance+100),Math.min(360,distance+200)][i]/[1.3,1,.7][i]*100,x:0,y:70})),spawned:c.getSnapshot().waveTotal,processed:0,shot:null});clock.set(c.now);
}
function solve(p){for(let mask=1;mask<1<<p.availablePieces.length;mask++){let n=0,d=1,ids=[];p.availablePieces.forEach((p,i)=>{if(mask&1<<i){n=n*p.fraction.den+p.fraction.num*d;d*=p.fraction.den;ids.push(p.id);}});if(n*p.targetFraction.den===p.targetFraction.num*d)return ids;}throw Error('No solution');}
const metrics='('+function(){const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},get=id=>{const e=document.querySelector('[data-testid="'+id+'"]');return e?rect(e):null;};return{hud:get('energy-mobile-hud'),dock:get('energy-console'),world:get('energy-portrait-world'),castle:get('energy-citadel'),turret:get('energy-turret-base'),viewport:get('energy-combat-viewport'),creeps:[701,702,703].map(id=>get('energy-creep-'+id)),width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,gate:get('energy-spawn-gate'),road:document.querySelector('[data-testid=energy-road] path:nth-child(2)').getAttribute('d')};}.toString()+')()';
try{
 b=await browserSession(390,844);b.onEvent('Runtime.consoleAPICalled',e=>{if(e.type==='error')report.errors.push(e.args.map(a=>a.description||a.value).join(' '));});
 for(const [w,h] of [[320,640],[360,640],[390,844],[412,915],[768,1024],[1440,1000]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:w<600,deviceScaleFactor:1});await open();await b.evaluate('('+fixture.toString()+')(40)');await sleep(130);
  const m=await b.evaluate(metrics);report.viewports.push({w,h,...m});
  check(w+' no horizontal overflow',m.width<=w,m.width);
  if(w<600){check(w+' no scroll',m.height<=h,m.height);check(w+' castle at right of gate',m.castle.x>m.gate.right,m);check(w+' actors clear HUD/dock',[m.castle,m.turret,...m.creeps].every(r=>r.y>=m.hud.bottom&&r.bottom<=m.dock.y),m);}
  await b.screenshot(out+'/images/'+w+'x'+h+'.png');
  // Sample the rendered ground, foot/shadow and upright pose through the complete route.
  for(const distance of [0,30,70,95,140,170,200,230,260,290,320,345,365]){
   await b.evaluate('('+fixture.toString()+')('+distance+')');await sleep(45);
   const row=await b.evaluate(`(()=>{const c=document.querySelector('[data-testid=energy-creep-701]'),s=document.querySelector('[data-testid=energy-creep-shadow-701]'),p=document.querySelector('[data-testid=energy-creep-pose-701]'),r=c.getBoundingClientRect(),shadow=s.getBoundingClientRect();return{pose:getComputedStyle(p).transform,foot:{x:r.x+r.width/2,y:r.y+r.height*228/256},shadow:{x:shadow.x+shadow.width/2,y:shadow.y+shadow.height/2},body:{x:r.x,y:r.y,bottom:r.bottom,right:r.right}};})()`);
   check(w+' upright at '+distance,!row.pose||row.pose==='none'||/^matrix\(1, 0, 0, 1,/.test(row.pose),row.pose);
   check(w+' shadow follows feet '+distance,Math.abs(row.foot.x-row.shadow.x)<.1&&Math.abs(row.foot.y-row.shadow.y)<1,row);
   if(w<600)check(w+' route fits '+distance,row.body.y>=m.hud.bottom&&row.body.bottom<=m.dock.y&&row.body.x>=0&&row.body.right<=w,row);
  }
  if(w===390){
   await b.evaluate('('+fixture.toString()+')(125)');await sleep(60);await b.screenshot(out+'/images/golem-purple-route.png');
   await b.send('Page.captureScreenshot',{format:'png',clip:{x:m.gate.x-8,y:m.gate.y-8,width:m.gate.width+35,height:m.gate.height+35,scale:2}}).then(r=>writeFile(out+'/images/spawn-gate.png',Buffer.from(r.data,'base64')));
   await b.send('Page.captureScreenshot',{format:'png',clip:{x:m.castle.x-30,y:m.castle.y-10,width:m.castle.width+45,height:m.castle.height+45,scale:2}}).then(r=>writeFile(out+'/images/castle-endpoint.png',Buffer.from(r.data,'base64')));
   const ids=await b.evaluate('('+solve.toString()+')(window.energyQA.engine.getSnapshot().problem)');for(const id of ids)await b.click(q('energy-crystal-'+id));
   const trace=b.evaluate(`new Promise(resolve=>{const rows=[],start=performance.now();function tick(t){const s=window.energyQA.engine.getSnapshot(),id=s.shot?.targetId;const e=id&&document.querySelector('[data-testid=energy-creep-'+id+']'),impact=document.querySelector('[data-testid=energy-impact]'),p=document.querySelector('[data-testid=energy-projectile]');if(e&&impact){const a=e.getBoundingClientRect(),i=impact.getBoundingClientRect();rows.push({ms:t-start,opacity:+getComputedStyle(impact).opacity,flight:p?+getComputedStyle(p).opacity:0,error:Math.hypot(i.x+i.width/2-(a.x+a.width/2),i.y+i.height/2-(a.y+a.height*(228/256-.36)))});}if(t-start<1000)requestAnimationFrame(tick);else resolve(rows);}requestAnimationFrame(tick);})`);
   await b.click(q('energy-fire'));const rows=await trace,hits=rows.filter(r=>r.opacity>.1);check('projectile visible',rows.some(r=>r.flight>.1));check('impact targets body',hits.length>0&&Math.max(...hits.map(r=>r.error))<4,hits);report.shot=rows;
  }
 }
 // Browser controller measurements for all normal waves and Endless through the 1s floor.
 report.schedules=[];
 for(const mode of ['easy','medium','hard']){await open(mode);const rows=await b.evaluate('('+function(solveText){
  const c=window.energyQA.engine,solve=eval('('+solveText+')'),rows=[],seen=new Set();let key='',start=0;
  const off=c.subscribe(()=>{const s=c.getSnapshot(),next=(s.endless?'endless':s.mode)+'-'+s.wave;if(next!==key){key=next;start=c.now;}for(const e of s.enemies)if(!seen.has(e.id)){seen.add(e.id);rows.push({mode:s.endless?'endless':s.mode,wave:s.wave,count:s.waveTotal,bornAt:e.bornAt,relativeMs:e.bornAt-start});}});
  // Start has already happened; first wave's origin remains clock=0.
  key=c.getSnapshot().mode+'-1';
  let i=0;while(i++<120000){const s=c.getSnapshot();if(s.status==='offer')c.acceptEndless(true);if(s.status==='won'||(s.endless&&s.wave===32))break;if(s.enemies.length&&!s.shot){for(const id of solve(s.problem))c.toggle(id);c.fire();}c.advanceTo(c.now+[17,31,53][i%3]);}
  off();c.pause();window.energyQA.clock.set(c.now);return{rows,steps:i,status:c.getSnapshot().status};
 }.toString()+')('+JSON.stringify(solve.toString())+')');check(mode+' schedule simulation completes',rows.steps<120000,rows.steps);report.schedules.push({mode,...rows});}
 // Restart + background/foreground in the actual renderer, while a deadline is pending.
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await open();
 await sleep(400);await b.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))");await sleep(100);
 const paused=await b.evaluate('({now:window.energyQA.clock.get(),spawned:window.energyQA.engine.getSnapshot().spawned,paused:window.energyQA.engine.getSnapshot().paused})');await sleep(2300);
 check('background freezes clock and pending spawn',await b.evaluate('window.energyQA.clock.get()')===paused.now&&paused.paused&&paused.spawned===0,paused);
 await b.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))");check('foreground awaits explicit resume',await b.evaluate('window.energyQA.engine.getSnapshot().paused'));
 await b.click(q('energy-resume'));await sleep(200);check('resume does not spawn backlog',await b.evaluate('window.energyQA.engine.getSnapshot().spawned')===0);
 // Actual 1x recording: legal seeded enemy selection, no clock jumps or entity fixtures.
 await open();await b.evaluate("(()=>{const c=window.energyQA.engine;let i=0;c.random=()=>[0,.4,.9][i++%3];window.liveRows=[];const seen=new Set();c.subscribe(()=>{for(const e of c.getSnapshot().enemies)if(!seen.has(e.id)){seen.add(e.id);window.liveRows.push({id:e.id,type:e.type,bornAt:e.bornAt,observedClock:window.energyQA.clock.get(),wall:performance.now()});}});})()");
 await mkdir(out+'/video-frames',{recursive:true});const events=[],writes=[];
 const off=b.onEvent('Page.screencastFrame',e=>{const file=String(events.length).padStart(5,'0')+'.jpg';events.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(out+'/video-frames/'+file,Buffer.from(e.data,'base64')));return b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
 await b.send('Page.startScreencast',{format:'jpeg',quality:82,maxWidth:390,maxHeight:844,everyNthFrame:3});
 const stamp=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get()})');
 await sleep(650);await b.click('[aria-label="T\u1ea1m d\u1eebng"]');await sleep(120);const freeze=await b.evaluate('window.energyQA.clock.get()');await sleep(3000);check('recorded pause freezes pending first spawn',await b.evaluate('window.energyQA.clock.get()')===freeze&&await b.evaluate('window.energyQA.engine.getSnapshot().spawned')===0);await b.screenshot(out+'/images/pause-pending-spawn.png');await b.click(q('energy-resume'));
 const started=Date.now();let nextLog=0;
 while(Date.now()-started<65000){await sleep(250);if(Date.now()-started>nextLog){console.log('1x recording '+Math.floor((Date.now()-started)/1000)+'s');nextLog+=10000;}}
 const end=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get(),rows:window.liveRows,state:window.energyQA.engine.getSnapshot()})');report.liveSpawns=end.rows;
 check('live first five spawns exact',end.rows.slice(0,5).map(r=>r.bornAt).join(',')==='2000,5500,9000,12500,16000',end.rows);
 check('live renderer publishes spawn within 100ms',end.rows.every(r=>r.observedClock-r.bornAt>=0&&r.observedClock-r.bornAt<100),end.rows);
 check('live escapes damage base exactly once each',end.state.processed===0||end.state.hp===100-end.state.processed*15,end.state);
 report.recording={start:stamp,end:{wall:end.wall,clock:end.clock},pauseMs:3000,frames:events.length,seconds:events.at(-1).timestamp-events[0].timestamp,platform:'Chrome web',speed:'1x, real clock, seeded enemy kinds only; no clock jumps or motion fixtures'};
 await b.send('Page.stopScreencast');off();await Promise.all(writes);await writeFile(out+'/video-frames/timestamps.json',JSON.stringify(events));
 await b.screenshot(out+'/images/castle-live-arrivals.png');
 check('no runtime exceptions',b.exceptions.length===0,b.exceptions);check('no console errors',report.errors.length===0,report.errors);
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(out+'/images/failure.png').catch(()=>{});throw error;}
finally{await writeFile(out+'/web-report.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,error:report.error}));}
