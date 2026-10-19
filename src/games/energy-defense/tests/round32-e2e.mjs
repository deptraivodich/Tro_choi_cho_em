// Focused sprite/anchor/lifecycle checks against the real production renderer.
// Controlled-clock fixtures are separate from the uninterrupted real-time 1x recording.
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-round32';
const mode=process.argv[2]||'all';
const root=path.resolve(out+'/web-dist');
await mkdir(out+'/video-frames',{recursive:true});
const report={platform:'Chrome production Web; not native Android/iOS',checks:[],errors:[],consoleErrors:[],checkpoints:[],shots:[]};
const q=id=>'[data-testid="'+id+'"]';
function check(name,value,details){report.checks.push({name,passed:!!value,details});assert.ok(value,name+': '+JSON.stringify(details));}
const server=http.createServer(async(req,res)=>{try{
 let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 let data;try{data=await readFile(file);}catch{file=path.join(root,'index.html');data=await readFile(file);}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);
}catch{res.writeHead(500);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let b;
const locate='('+function(){
 let f=document.querySelector('[data-testid=energy-mode-selection]');f=f?.[Object.keys(f).find(k=>k.startsWith('__reactFiber$'))];
 while(f){for(const candidate of[f,f.alternate]){let h=candidate?.memoizedState,engine,clock;
  for(let i=0;h&&i<120;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.advanceTo==='function')engine=v;if(!clock&&v&&typeof v.get==='function'&&typeof v.set==='function'&&typeof v.get()==='number')clock=v;}
  if(engine){window.energyQA={engine,clock};return true;}
 }f=f.return;}return false;
}.toString()+')()';
async function wait(expression,limit=20000){const start=Date.now();while(Date.now()-start<limit){if(await b.evaluate(expression))return;await sleep(25);}throw Error('Timeout '+expression);}
async function open(){await b.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/games/energy-defense`});await wait('!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');assert.ok(await b.evaluate(locate));}
async function start(){await b.click(q('energy-mode-hard'));await b.click(q('energy-start'));await wait('!!document.querySelector('+JSON.stringify(q('energy-combat-viewport'))+')');await wait('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');}
function solve(problem){const all=problem.availablePieces;for(let mask=1;mask<1<<all.length;mask++){let n=0,d=1;const ids=[];all.forEach((p,i)=>{if(mask&1<<i){n=n*p.fraction.den+p.fraction.num*d;d*=p.fraction.den;ids.push(p.id);}});if(n*problem.targetFraction.den===problem.targetFraction.num*d)return ids;}throw Error('No exact answer');}
const state=()=>b.evaluate('window.energyQA.engine.getSnapshot()');
async function selectAnswer(){const s=await state();for(const id of s.selected)await b.click(q('energy-crystal-'+id));for(const id of solve(s.problem))await b.click(q('energy-crystal-'+id));}
async function fixture(kinds,distance){await b.evaluate('('+function(kinds,distance){
 const q=window.energyQA,c=q.engine,stats={scout:[1.3,25],slime:[1,40],golem:[.7,60]};
 const enemies=kinds.map((type,i)=>({id:701+i,type,speed:stats[type][0],hp:stats[type][1],maxHp:stats[type][1],bornAt:c.now-distance/stats[type][0]*100,x:0,y:70}));
 c.publish({enemies,spawned:c.getSnapshot().waveTotal,processed:0,shot:null,selected:[],feedback:null,paused:false});q.clock.set(c.now);
}.toString()+')('+JSON.stringify(kinds)+','+distance+')');await sleep(60);}
// Read actual intermediate renderer transforms, rather than only the final logical state.
const inspect='('+function(){
 const q=window.energyQA,clock=q.clock.get();
 const vp=document.querySelector('[data-testid=energy-combat-viewport]').getBoundingClientRect(),scale=vp.width/700;
 const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};
 const enemies=q.engine.getSnapshot().enemies.map(enemy=>{
  const e=document.querySelector('[data-testid="energy-creep-'+enemy.id+'"]'),p=document.querySelector('[data-testid="energy-creep-pose-'+enemy.id+'"]'),s=document.querySelector('[data-testid="energy-creep-shadow-'+enemy.id+'"]'),f=document.querySelector('[data-testid="energy-sprite-frame-'+enemy.id+'"]');
  if(!e||!p||!s||!f)return{...enemy,missing:true};
  const box=rect(e),shadow=rect(s),matrix=new DOMMatrix(getComputedStyle(p).transform),fm=new DOMMatrix(getComputedStyle(f).transform);
  return{...enemy,box,shadow,angle:Math.atan2(matrix.b,matrix.a),opacity:+getComputedStyle(p).opacity,frame:Math.round(-fm.m41/box.width),ground:{x:box.cx,y:box.y+box.height*228/256}};
 });
 const shot=q.engine.getSnapshot().shot,impact=document.querySelector('[data-testid=energy-impact]');
 return{clock,scale,vp:{x:vp.x,y:vp.y,width:vp.width,height:vp.height},enemies,shot,impact:impact?{...rect(impact),opacity:+getComputedStyle(impact).opacity}:null};
}.toString()+')()';
async function screenshot(name,selectors=[q('energy-combat-viewport')],scale=1.5){
 const clip=await b.evaluate('('+function(selectors,scale){const rs=selectors.map(s=>document.querySelector(s).getBoundingClientRect());const x=Math.max(0,Math.min(...rs.map(r=>r.x))-16),y=Math.max(0,Math.min(...rs.map(r=>r.y))-16);return{x,y,width:Math.min(innerWidth-x,Math.max(...rs.map(r=>r.right))-x+16),height:Math.min(innerHeight-y,Math.max(...rs.map(r=>r.bottom))-y+16),scale};}.toString()+')('+JSON.stringify(selectors)+','+scale+')');
 const capture=await b.send('Page.captureScreenshot',{clip});await writeFile(out+'/'+name+'.png',Buffer.from(capture.data,'base64'));
}
async function trace(ms){return b.evaluate(`new Promise(resolve=>{const rows=[],start=performance.now();function step(t){rows.push({t:t-start,...${inspect}});if(t-start<${ms})requestAnimationFrame(step);else resolve(rows)}requestAnimationFrame(step)})`);}
try{
 b=await browserSession(1440,1000);
 b.onEvent('Runtime.consoleAPICalled',e=>{if(e.type==='error')report.consoleErrors.push(e.args.map(a=>a.description||a.value).join(' '));});
 await open();await start();
 if(mode==='all'||mode==='sprites'){
 for(const kind of['scout','slime','golem']){
  for(const distance of[140,164.9,169.9,175.1,207,239.9,244.9,250.1,290]){
   await fixture([kind],distance);const row=await b.evaluate(inspect),e=row.enemies[0];report.checkpoints.push({kind,distance,...row});
   check(kind+' remains upright at '+distance,!e.missing&&Math.abs(e.angle)<.001,e);
   const expectedSize=Math.max(26,(kind==='golem'?72:62)*row.scale);
   check(kind+' retains sprite size at '+distance,Math.abs(e.box.width-expectedSize)<.05&&Math.abs(e.box.height-expectedSize)<.05,e.box);
   check(kind+' shadow stays at its foot at '+distance,Math.abs(e.shadow.cx-e.ground.x)<.05&&Math.abs(e.shadow.cy-e.ground.y)<1,e);
   if(kind==='slime'&&[140,207,250.1].includes(distance))await screenshot('purple-'+(distance===140?'horizontal':distance===207?'vertical':'lower-corner'));
  }
 }
 await fixture(['golem'],248.5);
 const walk=await trace(2100);const frames=[...new Set(walk.map(r=>r.enemies[0]?.frame))];
 check('Actual golem animation visits all four frames',frames.length===4&&[0,1,2,3].every(i=>frames.includes(i)),frames);
 await fixture(['golem'],251.5);await screenshot('golem-former-error-position');await screenshot('golem-former-error-closeup',[q('energy-creep-701')],3);
 await fixture(['scout','slime','golem'],160);
 const corner=await trace(3000);await writeFile(out+'/corner-trace.json',JSON.stringify(corner));
 check('All three kinds actually move upright through the first corner',corner[0].enemies.length===3&&corner.at(-1).enemies.every((e,i)=>Math.abs(e.angle)<.001&&Math.hypot(e.ground.x-corner[0].enemies[i].ground.x,e.ground.y-corner[0].enemies[i].ground.y)>20));
 await b.click('[aria-label="Tạm dừng"]');await sleep(100);const paused=await b.evaluate(inspect);await sleep(400);const still=await b.evaluate(inspect);
 check('Pause freezes clock and every sprite frame/position',paused.clock===still.clock&&JSON.stringify(paused.enemies)===JSON.stringify(still.enemies));
 await b.click(q('energy-resume'));await sleep(180);check('Resume continues from the same scene',await b.evaluate('window.energyQA.clock.get()')>still.clock);
 }
 if(mode==='all'||mode==='shots'){
 for(const kind of['scout','slime','golem']){
  await fixture([kind],205);await selectAnswer();
  const previous=await state();const recording=trace(1100);await b.click(q('energy-fire'));const rows=await recording;
  await writeFile(out+'/shot-'+kind+'-trace.json',JSON.stringify(rows,null,2));
  const hit=rows.filter(r=>r.impact?.opacity>.1&&r.enemies.length),fades=rows.flatMap(r=>r.enemies).filter(e=>e.opacity>0&&e.opacity<1);
  check(kind+' real hit and death fade are visible',hit.length>0&&fades.length>0,{hitSamples:hit.length,fadeSamples:fades.length});
  const errors=hit.map(r=>{const e=r.enemies[0];return Math.hypot(r.impact.cx-e.ground.x,r.impact.cy-(e.ground.y-e.box.height*.36));});
  check(kind+' tower still hits the upright target body',Math.max(...errors)<4,{maximumErrorPx:Math.max(...errors)});
  check(kind+' keeps the original logical target ID',rows.some(r=>r.shot?.targetId===701));
  const end=await state();check(kind+' resolves the kill exactly once',end.kills===previous.kills+1&&end.score===previous.score+25&&!end.enemies.length&&!end.shot,end);
  await sleep(650);const later=await state();
  check(kind+' removed sprite/shadow/frame do not reappear or award another kill',later.kills===end.kills&&later.score===end.score&&await b.evaluate('!document.querySelector("[data-testid=energy-creep-701]")&&!document.querySelector("[data-testid=energy-creep-shadow-701]")&&!document.querySelector("[data-testid=energy-sprite-frame-701]")'));
  report.shots.push({kind,maximumImpactErrorPx:Math.max(...errors),rows});console.log('Verified real shot '+kind);
 }
 }
 if(mode==='all'||mode==='record'){
 // Fresh real game: original spawn spacing, speed, damage and camera; no clock jumps.
 await open();await b.evaluate('window.energyQA.engine.random=(()=>{let i=0;return()=>[.01,.45,.99][i++%3]})()');
 const framesOut=[],writes=[];
 const off=b.onEvent('Page.screencastFrame',e=>{const file=String(framesOut.length).padStart(5,'0')+'.jpg';framesOut.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(out+'/video-frames/'+file,Buffer.from(e.data,'base64')));return b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
 await b.send('Page.startScreencast',{format:'jpeg',quality:80,maxWidth:1152,maxHeight:800,everyNthFrame:1});
 await start();
 const realStart=await b.evaluate('window.energyQA.clock.get()');
 await b.evaluate(`window.enemyRecordingTrace=[];window.enemyRecordingStart=performance.now();(()=>{let last=-1000;function tick(t){if(t-last>=90){window.enemyRecordingTrace.push({wallMs:t-window.enemyRecordingStart,...${inspect}});last=t;}if(t-window.enemyRecordingStart<58000)requestAnimationFrame(tick);}requestAnimationFrame(tick);})()`);
 let nextLog=5000;const wallStart=Date.now();
 while(Date.now()-wallStart<51000){await sleep(250);if(Date.now()-wallStart>=nextLog){console.log('1x recording '+Math.floor((Date.now()-wallStart)/1000)+'s');nextLog+=5000;}}
 const simulation=await b.evaluate('window.energyQA.clock.get()')-realStart;
 check('Recording runs at 1x without simulation fast-forward',Math.abs(simulation-(Date.now()-wallStart))<500,{simulationMs:simulation,wallMs:Date.now()-wallStart});
 await selectAnswer();const beforeShot=await state();await b.click(q('energy-fire'));await sleep(1000);
 const afterShot=await state();check('Recorded natural run kills its final golem and advances the wave',beforeShot.enemies.length===1&&beforeShot.enemies[0].type==='golem'&&afterShot.wave===2&&afterShot.kills===1,{before:beforeShot,after:afterShot});
 await b.send('Page.stopScreencast');off();await Promise.all(writes);
 const realTrace=await b.evaluate('window.enemyRecordingTrace');await writeFile(out+'/recording-trace.json',JSON.stringify(realTrace));
 for(const kind of['scout','slime','golem']){
  const distances=realTrace.flatMap(r=>r.enemies.filter(e=>e.type===kind).map(e=>({d:(r.clock-e.bornAt)*e.speed/100,angle:e.angle})));
  check('1x video contains '+kind+' on horizontal, vertical and after both bends',[d=>d<165,d=>d>180&&d<235,d=>d>250].every(test=>distances.some(s=>test(s.d)&&Math.abs(s.angle)<.001)));
 }
 await writeFile(out+'/video-frames/timestamps.json',JSON.stringify(framesOut));
 report.recording={capturedFrames:framesOut.length,seconds:framesOut.at(-1).timestamp-framesOut[0].timestamp,speed:'1x real clock; no clock/controller jumps',audio:false,source:'Actual Chrome pixels; all three enemy types traverse both corners using original spawn/speeds'};
 }
 report.errors.push(...b.exceptions);check('No uncaught browser exceptions',!report.errors.length,report.errors);check('No console errors',!report.consoleErrors.length,report.consoleErrors);
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(out+'/failed-web.png').catch(()=>{});throw error;}
finally{await writeFile(out+'/web-'+mode+'-verification.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({mode,checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,recording:report.recording,error:report.error}));}
