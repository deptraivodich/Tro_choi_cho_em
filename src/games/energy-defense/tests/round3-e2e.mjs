// Browser touch input + controlled-clock checkpoints. Web evidence, never native-device evidence.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { browserSession, sleep } from '../../../../scripts/lib/cdp.mjs';
const folder='artifacts/energy-defense-round3';
await mkdir(folder,{recursive:true});
const url=process.env.ENERGY_WEB_URL||'http://localhost:8097';
const report={platform:'Chrome production Web; NOT Android/iOS native',checks:[],viewports:[],errors:[],consoleErrors:[],performance:[],fixtures:'Full normal-mode answer flows use real CDP touch input; waiting/progression use a controlled clock. Additional Challenge checkpoints use the real controller with exact answers. 10/13/25-enemy renderer stress uses synthetic entity populations with unchanged enemy stats. The recording runs at real 1x with no fast-forward.'};
const check=(name,value,details)=>{assert.ok(value,name+': '+JSON.stringify(details));report.checks.push({name,passed:true,details});console.log('PASS',name);};
const q=id=>'[data-testid="'+id+'"]';
const locate='('+function(){
 const root=document.querySelector('[data-testid="energy-mode-selection"]')||document.querySelector('[data-testid="energy-defense"]');
 if(!root)return null;
 let f=root[Object.keys(root).find(k=>k.startsWith('__reactFiber$'))];
 while(f){for(const candidate of [f,f.alternate]){let h=candidate?.memoizedState,engine=null,clock=null;
  for(let i=0;h&&i<120;i++,h=h.next){const v=h.memoizedState;
   if(v&&typeof v.getSnapshot==='function'&&typeof v.advanceTo==='function')engine=v;
   if(!clock&&v&&typeof v.get==='function'&&typeof v.set==='function'&&typeof v.get()==='number')clock=v;
  }if(engine){window.energyQA={engine,clock};return engine.getSnapshot();}
 }f=f.return;}return null;
}.toString()+')()';
function solution(problem){const all=problem.availablePieces;
 for(let mask=1;mask<1<<all.length;mask++){let n=0,d=1;const ids=[];
  for(let i=0;i<all.length;i++)if(mask&1<<i){const p=all[i];ids.push(p.id);n=n*p.fraction.den+p.fraction.num*d;d*=p.fraction.den;}
  if(n*problem.targetFraction.den===problem.targetFraction.num*d)return ids;
 }throw new Error('Problem has no exact solution');
}
async function wait(b,expression,timeout=90000){const start=Date.now();while(Date.now()-start<timeout){if(await b.evaluate(expression))return;await sleep(80);}throw new Error('Timeout '+expression);}
async function open(b){
 b.onEvent('Runtime.consoleAPICalled',e=>{if(e.type==='error')report.consoleErrors.push(e.args.map(a=>a.description||a.value).join(' '));});
 await b.send('Page.navigate',{url:url+'/games/energy-defense'});await b.send('Page.bringToFront');
 await wait(b,'!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');
 await wait(b,'document.images.length>=2&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');
 await b.evaluate(locate);await b.evaluate('window.energyQA.solution='+solution.toString());
}
const state=b=>b.evaluate('window.energyQA.engine.getSnapshot()');
async function sync(b,delta){await b.evaluate('(()=>{const q=window.energyQA;q.engine.advanceTo(q.engine.now+'+delta+');q.clock.set(q.engine.now);})()');await sleep(25);}
async function select(b,ids){const s=await state(b);for(const id of s.selected)await b.click(q('energy-crystal-'+id));for(const id of ids)assert.ok(await b.click(q('energy-crystal-'+id)),'crystal '+id);}
async function answer(b){let s=await state(b);if(s.shot){await sync(b,900);s=await state(b);}while(!s.enemies.length&&s.status==='running'){await sync(b,1000);s=await state(b);}
 if(s.status!=='running')return;
 const before=s.correct;await select(b,solution(s.problem));assert.ok(await b.click(q('energy-fire')));s=await state(b);assert.equal(s.correct,before+1);await sync(b,850);
}
async function start(b,mode){await b.click(q('energy-mode-'+mode));await b.click(q('energy-start'));await wait(b,'!!document.querySelector('+JSON.stringify(q('energy-fire'))+')');await wait(b,'document.images.length>=6&&Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');}
async function chooseAgain(b){await b.click(q('energy-choose-again'));await wait(b,'!!document.querySelector('+JSON.stringify(q('energy-start'))+')');}
async function finishViaInput(b){let i=0;while((await state(b)).status==='running'&&i++<80)await answer(b);assert.ok(i<80);}
async function fastCheckpoint(b,wave=0){
 return b.evaluate('('+function(wave){
  const q=window.energyQA,c=q.engine;let i=0;
  while(c.getSnapshot().status==='running'&&i++<100000){
   const s=c.getSnapshot();if(wave&&s.endless&&s.wave>=wave)break;
   if(s.enemies.length&&!s.shot){for(const id of q.solution(s.problem))c.toggle(id);c.fire();}
   c.advanceTo(c.now+100);
  }q.clock.set(c.now);return c.getSnapshot();
 }.toString()+')('+wave+')');
}
async function firePause(b){
 const points=await b.evaluate('['+JSON.stringify(q('energy-fire'))+',"\\u005baria-label=\\"Tạm dừng\\"\\u005d"].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})');
 for(const p of points){await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1,force:1}]});await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
}
async function saveReport(){await writeFile(folder+'/web-verification.json',JSON.stringify(report,null,2));}
async function closeup(b,file,selectors,scale=2){
 const clip=await b.evaluate('('+function(selectors,scale){const rs=selectors.map(s=>document.querySelector(s).getBoundingClientRect());const x=Math.max(0,Math.min(...rs.map(r=>r.x))-8),y=Math.max(0,Math.min(...rs.map(r=>r.y))-8);return{x,y,width:Math.min(innerWidth-x,Math.max(...rs.map(r=>r.right))-x+8),height:Math.min(innerHeight-y,Math.max(...rs.map(r=>r.bottom))-y+8),scale};}.toString()+')('+JSON.stringify(selectors)+','+scale+')');
 const result=await b.send('Page.captureScreenshot',{clip});await writeFile(folder+'/'+file,Buffer.from(result.data,'base64'));
}
const only=process.argv.includes('--loss')?'loss':process.argv.includes('--responsive')?'responsive':process.argv.includes('--record')?'record':process.argv.includes('--performance')?'performance':'all';
if(only!=='all'){try{Object.assign(report,JSON.parse(await readFile(folder+'/web-verification.json','utf8')));}catch{}}
if(only==='performance')report.performance=[];
if(only==='all'){
 const b=await browserSession(1440,1000);
 try{
  await open(b);await b.screenshot(folder+'/mode-selection.png');await sleep(600);
  let s=await state(b);check('No enemy, score or gameplay time before Start',s.status==='select'&&s.enemies.length===0&&s.elapsedSeconds===0&&s.score===0);
  for(const [mode,total,waves]of[['easy',19,5],['medium',19,5],['hard',49,7]]){
   await start(b,mode);s=await state(b);
   check(mode+' locks mode selection in combat',!await b.evaluate('!!document.querySelector('+JSON.stringify(q('energy-mode-easy'))+')')&&await b.evaluate('window.energyQA.engine.selectMode("hard")===false'));
   check(mode+' removes freeze control and equivalent helper labels',!await b.evaluate('!!document.querySelector('+JSON.stringify(q('energy-freeze'))+')')&&!await b.evaluate('/\\([0-9]/.test(document.querySelector('+JSON.stringify(q('energy-console'))+').innerText)'));
   await b.screenshot(folder+'/'+mode+'-combat.png');
   if(mode==='easy'){
    const wrong=s.problem.availablePieces.find(p=>p.numericVal!==s.problem.targetNumeric);await select(b,[wrong.id]);await b.click(q('energy-fire'));
    check('Wrong answer does not add points',(await state(b)).score===0);
    await select(b,solution((await state(b)).problem));await firePause(b);await sleep(250);
    const clock=await b.evaluate('window.energyQA.clock.get()');await sleep(650);
    check('Pause freezes shot and clock while opaque modal hides the battle',(await state(b)).paused&&!!(await state(b)).shot&&Math.abs(await b.evaluate('window.energyQA.clock.get()')-clock)<1);
    await b.screenshot(folder+'/paused.png');await b.click(q('energy-resume'));await sleep(850);check('Resume resolves the shot once',(await state(b)).kills===1&&(await state(b)).score===25);
   }
   await select(b,solution((await state(b)).problem));await b.screenshot(folder+'/'+mode+'-math-selected.png');
   await finishViaInput(b);s=await state(b);
   check(mode+' completes exact configured total via UI answers',s.kills===total&&s.processed===(mode==='hard'?10:mode==='medium'?7:5)&&s.wave===waves&&s.score===total*25,{kills:s.kills,wave:s.wave,score:s.score,status:s.status});
   if(mode==='hard'){check('Challenge offers Endless only after wave 7',s.status==='offer'&&!s.enemies.length&&!s.shot);await b.screenshot(folder+'/endless-offer.png');await b.click(q('energy-endless-no'));check('No ends Challenge as a normal victory',(await state(b)).status==='won'&&!(await state(b)).endless);}
   else check(mode+' ends with victory',s.status==='won');
   await b.screenshot(folder+'/'+mode+'-result.png');await chooseAgain(b);
  }
  await start(b,'hard');await fastCheckpoint(b);await b.click(q('energy-endless-yes'));s=await state(b);
  check('Yes begins Endless 1 at zero separate counters',s.endless&&s.wave===1&&s.waveTotal===10&&s.endlessKills===0&&s.endlessScore===0&&s.endlessSeconds<2);
  for(let i=0;i<5;i++)await answer(b);
  check('Five Endless kills equal exactly 50 points',(await state(b)).endlessScore===50&&(await state(b)).endlessKills===5);
  await b.screenshot(folder+'/endless-wave-1.png');await fastCheckpoint(b,4);s=await state(b);
  check('Endless wave 4 advances to 13 enemies',s.wave===4&&s.waveTotal===13&&s.endlessCompleted===3&&s.endlessScore===s.endlessKills*10);
  await b.screenshot(folder+'/endless-wave-4.png');
  const expectedScore=s.endlessScore;await b.click('[aria-label="Về sảnh"]');await wait(b,'!!document.querySelector('+JSON.stringify('[data-testid="game-card-play-energy-defense"]')+')');
  await open(b);await b.click(q('energy-history-open'));await wait(b,'document.querySelectorAll("[data-testid=\\"energy-history-record\\"]").length===1');
  check('Intentional exit stores exactly one Endless record with its own points',await b.evaluate('document.querySelector("[data-testid=\\"energy-history-record\\"]").innerText.includes("'+expectedScore+' điểm")'));
  await b.screenshot(folder+'/endless-history.png');await b.send('Page.reload');await wait(b,'!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');await b.evaluate(locate);await b.evaluate('window.energyQA.solution='+solution.toString());await b.click(q('energy-history-open'));await wait(b,'document.querySelectorAll("[data-testid=\\"energy-history-record\\"]").length===1');
  check('History and best score survive a page reload',await b.evaluate('document.body.innerText.includes("THÀNH TÍCH CAO NHẤT")'));
  await b.click('[aria-label="ĐÓNG LỊCH SỬ"]');await start(b,'hard');await fastCheckpoint(b);await b.click(q('energy-endless-yes'));await answer(b);
  await b.send('Page.reload');await wait(b,'!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');await b.evaluate(locate);await b.click(q('energy-history-open'));await wait(b,'document.querySelectorAll("[data-testid=\\"energy-history-record\\"]").length===1');
  check('An interrupted unfinished run does not fabricate a completion',await b.evaluate('document.querySelectorAll("[data-testid=\\"energy-history-record\\"]").length===1'));
  report.errors.push(...b.exceptions);
 }catch(e){await b.screenshot(folder+'/failed-desktop.png');console.log(await b.evaluate('document.body.innerText'));throw e;}finally{await b.close();await saveReport();}
}
if(only==='all'||only==='responsive'){
 for(const [name,w,h]of[['mobile-360',360,640],['mobile-390',390,844],['mobile-412',412,915],['small-mobile',320,640],['tablet',768,1024],['tablet-landscape',1024,768],['laptop',1366,768],['desktop',1200,900],['phone-landscape',844,390]]){
  const b=await browserSession(w,h);
  try{
   await open(b);await b.screenshot(folder+'/'+name+'-selection.png');await start(b,'hard');await select(b,solution((await state(b)).problem));await b.screenshot(folder+'/'+name+'-selected.png');
   const metrics=await b.evaluate('(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};return{battle:rect('+JSON.stringify(q('energy-combat-viewport'))+'),fire:rect('+JSON.stringify(q('energy-fire'))+'),crystals:Array.from(document.querySelectorAll("[data-testid^=\\"energy-crystal-\\"]")).map(e=>rect("[data-testid=\\""+e.dataset.testid+"\\"]")),documentWidth:document.documentElement.scrollWidth}})()');
   check(name+' has no horizontal overflow',metrics.documentWidth<=w,metrics);
   if(w<1000||h<1000){
    check(name+' keeps combat visible while selecting',metrics.battle.top>=0&&metrics.battle.bottom<=h&&metrics.battle.height>=170,metrics);
    check(name+' keeps all six crystal values and fire touch targets visible',metrics.crystals.length===6&&metrics.crystals.every(r=>r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=metrics.fire.top)&&metrics.fire.bottom<=h&&metrics.fire.height>=44,metrics);
   }
   await b.click(q('energy-fire'));await sleep(850);check(name+' fires using real touch input',(await state(b)).score===25);
   report.viewports.push({name,width:w,height:h,...metrics});report.errors.push(...b.exceptions);
  }catch(e){await b.screenshot(folder+'/failed-'+name+'.png');throw e;}finally{await b.close();await saveReport();}
 }
}
if(only==='all'||only==='performance'){
 for(const [count,w,h]of[[10,1366,900],[13,1366,900],[25,1366,900],[25,390,844]]){
  const b=await browserSession(w,h);
  try{
   await open(b);await start(b,'hard');await fastCheckpoint(b);await b.click(q('energy-endless-yes'));
   await b.evaluate('('+function(count){
    const q=window.energyQA,c=q.engine,stats=[['scout',1.3,25],['slime',1,40],['golem',.7,60]];
    const enemies=Array.from({length:count},(_,i)=>{const[type,speed,hp]=stats[i%3];return{id:1000+i,type,speed,hp,maxHp:hp,bornAt:c.now-i*800,x:0,y:70};});
    c.publish({enemies,spawned:count,waveTotal:count,processed:0});q.clock.set(c.now);
   }.toString()+')('+count+')');await sleep(800);
const sample=await b.evaluate('new Promise(resolve=>{const start=performance.now(),times=[],poses=[];function f(t){times.push(t);const e=document.querySelector("[data-testid=\\\"energy-sprite-frame-1000\\\"]");poses.push(e?getComputedStyle(e).transform:null);if(t-start<5000)requestAnimationFrame(f);else resolve({times,poses,heap:performance.memory?.usedJSHeapSize,entities:document.querySelectorAll("[data-testid^=\\"energy-sprite-frame-\\"]").length})}requestAnimationFrame(f)})');
   const deltas=sample.times.slice(1).map((v,i)=>v-sample.times[i]).sort((a,b)=>a-b),mean=deltas.reduce((a,b)=>a+b,0)/deltas.length;
   const walkPoseChanges=sample.poses.reduce((n,p,i)=>n+(i>0&&p!==sample.poses[i-1]?1:0),0);
   const metric={count,width:w,height:h,frames:sample.times.length,meanFps:1000/mean,meanFrameMs:mean,p95FrameMs:deltas[Math.floor(deltas.length*.95)],maxFrameMs:deltas.at(-1),jsHeapBytes:sample.heap,entities:sample.entities,walkPoseChanges,fixture:true};
   report.performance.push(metric);check(count+' renderer entities are mounted at '+w,sample.entities===count,metric);
   check(count+' entities preserve the distance-driven walk cadence at '+w,walkPoseChanges>=15&&walkPoseChanges<=25,{walkPoseChanges,sampleSeconds:5});
   await b.screenshot(folder+'/stress-'+count+'-'+w+'.png');report.errors.push(...b.exceptions);
  }finally{await b.close();await saveReport();}
 }
}
if(only==='all'||only==='record'){
 const b=await browserSession(1200,900);
 try{
  await open(b);await b.evaluate('window.energyQA.engine.random=(()=>{let i=0;return()=>[.01,.45,.99][i++%3]})()');await start(b,'hard');await sleep(6500);
  const monsterSelectors=await b.evaluate('Array.from(document.querySelectorAll("[data-testid^=\\"energy-creep-\\"]")).filter(e=>/^energy-creep-[0-9]+$/.test(e.dataset.testid)).map(e=>"[data-testid=\\""+e.dataset.testid+"\\"]")');
  await closeup(b,'closeup-monsters.png',monsterSelectors);await closeup(b,'closeup-turret.png',[q('energy-turret-base'),q('energy-turret-head')]);await closeup(b,'closeup-castle.png',[q('energy-citadel')]);await closeup(b,'battlefield.png',[q('energy-combat-viewport')],1.5);
  const region=await b.evaluate('(()=>{const r=document.querySelector('+JSON.stringify(q('energy-combat-viewport'))+').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight}})()');await writeFile(folder+'/recording-region.json',JSON.stringify(region));
  const frames=[],writes=[];await mkdir(folder+'/video-frames',{recursive:true});
  const off=b.onEvent('Page.screencastFrame',e=>{const file=String(frames.length).padStart(5,'0')+'.jpg';frames.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(folder+'/video-frames/'+file,Buffer.from(e.data,'base64')));return b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
  await b.send('Page.startScreencast',{format:'jpeg',quality:75,maxWidth:960,maxHeight:720,everyNthFrame:1});
const tracePromise=b.evaluate('new Promise(resolve=>{const start=performance.now(),rows=[];function f(t){const read=id=>{const e=document.querySelector("[data-testid=\\""+id+"\\"]");if(!e)return null;const r=e.getBoundingClientRect();return{opacity:+getComputedStyle(e).opacity,x:r.x+r.width/2,y:r.y+r.height/2}};rows.push({t:t-start,at:Date.now()/1000,charge:read("energy-charge"),muzzle:read("energy-muzzle"),anchor:read("energy-muzzle-anchor"),flight:read("energy-projectile"),impact:read("energy-impact"),poses:Array.from(document.querySelectorAll("[data-testid^=\\"energy-creep-pose-\\"]"),e=>+getComputedStyle(e).opacity)});if(t-start<11000)requestAnimationFrame(f);else resolve(rows)}requestAnimationFrame(f)})');
  await sleep(1500);await select(b,solution((await state(b)).problem));await b.click(q('energy-fire'));await sleep(1300);
  await select(b,solution((await state(b)).problem));await b.click(q('energy-fire'));await sleep(1300);
  await select(b,solution((await state(b)).problem));await b.click(q('energy-fire'));await sleep(1300);
  const trace=await tracePromise;await b.send('Page.stopScreencast');off();await Promise.all(writes);await writeFile(folder+'/video-frames/timestamps.json',JSON.stringify(frames,null,2));await writeFile(folder+'/combat-trace.json',JSON.stringify(trace,null,2));
  for(const name of ['charge','flight','impact'])check('Recorded real 1x '+name,trace.some(r=>r[name]?.opacity>.1));
  check('Recorded visible death fade',trace.some(r=>r.poses.some(p=>p>0&&p<1)));
  const muzzleErrors=trace.filter(r=>r.muzzle?.opacity>.1&&r.anchor).map(r=>Math.hypot(r.muzzle.x-r.anchor.x,r.muzzle.y-r.anchor.y));check('Muzzle matches rotating art anchor',muzzleErrors.length>0&&Math.max(...muzzleErrors)<4,{maxErrorPx:Math.max(...muzzleErrors)});
  report.recording={platform:'Web Chrome, 1x; no native testing, no audio',frames:frames.length,seconds:frames.at(-1).timestamp-frames[0].timestamp};
  await b.screenshot(folder+'/combat-after.png');report.errors.push(...b.exceptions);
 }finally{await b.close();await saveReport();}
}
if(only==='loss'){
 const b=await browserSession(1200,900);
 try{
  await open(b);await start(b,'hard');await fastCheckpoint(b);await b.click(q('energy-endless-yes'));
  for(let i=0;i<5;i++)await answer(b);
  await sync(b,500000);const s=await state(b);
  check('Endless ends by base defeat, never by the normal timer',s.status==='lost'&&s.reason==='defeat'&&s.endlessScore===50&&s.endlessKills===5);
  await b.screenshot(folder+'/endless-defeat.png');await b.click('[aria-label="LỊCH SỬ VÔ TẬN"]');
  await wait(b,'document.querySelectorAll("[data-testid=\\"energy-history-record\\"]").length===1');
  check('Defeat persists only kills, completed waves and its actual ending reason',await b.evaluate('document.querySelector("[data-testid=\\"energy-history-record\\"]").innerText.includes("50 điểm")&&document.querySelector("[data-testid=\\"energy-history-record\\"]").innerText.includes("Căn cứ thất thủ")'));
  await b.screenshot(folder+'/endless-loss-history.png');report.errors.push(...b.exceptions);
 }finally{await b.close();await saveReport();}
}
check('No uncaught Web exceptions',report.errors.length===0,report.errors);
check('No Web console errors',report.consoleErrors.length===0,report.consoleErrors);
await saveReport();
console.log('Evidence '+folder);
