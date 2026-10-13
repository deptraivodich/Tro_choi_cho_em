import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, sleep, observeRace } from './lib/cdp.mjs';
const output = 'artifacts/race-movement-timing';
const url = process.env.GAME_URL || 'http://127.0.0.1:8090';
const pauseOnly = process.argv.includes('--pause-only');
await mkdir(output,{recursive:true});
const report = { platform:'web Chrome, landscape 800x360, normal motion; NOT Android native', scenarios:[],checks:[] };
const check=(condition,label)=>{ assert.ok(condition,label); report.checks.push(label); };
async function wait(s,predicate,ms=120000) {
 const end=Date.now()+ms;
 while(Date.now()<end) {if(await predicate())return;await sleep(30);}
 throw Error('Timeout waiting for UI');
}
async function clickText(s,text) {
 const selector=await s.evaluate(`(()=>{
  const list=[...document.querySelectorAll('div,button')].filter(e=>e.textContent.includes(${JSON.stringify(text)})&&e.getBoundingClientRect().width);
  list.sort((a,b)=>a.textContent.length-b.textContent.length);
  document.querySelectorAll('[data-timing-click]').forEach(e=>e.removeAttribute('data-timing-click'));
  const leaf=list[0],e=leaf&&(leaf.closest('[role="button"],[tabindex="0"]')||leaf);if(!e)return null;e.setAttribute('data-timing-click','1');return '[data-timing-click="1"]';
 })()`);
 assert.ok(selector,`button ${text}`);assert.ok(await s.click(selector));
}
const seedFor=dice=>{
 for(let seed=1;seed<1000;seed++) {
  let t=seed+0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  if(Math.floor(((t^(t>>>14))>>>0)/4294967296*6)+1===dice)return seed;
 }
};
async function enter(s,dice,local=true) {
 await s.send('Page.addScriptToEvaluateOnNewDocument',{source:`Math.random=()=>${seedFor(dice)}/0xffffffff;`});
 await s.send('Page.navigate',{url});
 await wait(s,()=>s.evaluate(`!!document.querySelector('[data-testid="game-card-play-race-to-finish"]')`));
 assert.ok(await s.click('[data-testid="game-card-play-race-to-finish"]'));
 await wait(s,()=>s.evaluate(`!!document.querySelector('[data-testid="start-race-button"]')&&document.querySelector('[data-testid="start-race-button"]').getAttribute('aria-disabled')!=='true'`));
 if(local)await clickText(s,'Chơi cùng bạn');
 await clickText(s,'2 Người chơi');await s.click('[data-testid="race-setup-character-0-bunny"]');await s.click('[data-testid="start-race-button"]');
 await wait(s,async()=>{const st=await s.evaluate(observeRace);return st&&!st.isPaused;});
}
async function answer(s,q) {
 if(q.choices)await clickText(s,q.answer);
 else {
  await s.evaluate(`(()=>{const e=document.querySelector('[data-testid="math-answer-input"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(`${q.answer.n}/${q.answer.d}`)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await sleep(70);await s.click('[data-testid="math-submit"]');
 }
}
// Read-only store + computed pixels on every rendered frame. No test path,
// forced movement callback, injected dice event or added application test API.
const sampler=`(()=>{
 const initial=${observeRace};
 const e=document.querySelector('[data-testid^="token-"]');
 const k=Object.keys(e).find(k=>k.startsWith('__reactFiber$'));let f=e[k],controller;
 while(f&&!controller){let h=f.memoizedState;for(let i=0;h&&i<100;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.startGame==='function'){controller=v;break;}}f=f.return;}
 if(!controller)throw Error('Store unavailable');
 window.__timingFrames=[];window.__timingCapture=true;
 function transform(e){if(!e)return null;const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return [m.m41,m.m42,m.a,m.b,m.c,m.d];}
 function capture(t){
  if(!window.__timingCapture)return;
  const st=controller.getSnapshot(),p=st.players[st.activePlayerIndex];
  const token=document.querySelector('[data-testid="token-'+p.id+'"]');
  const clip=token?.querySelector('[data-testid="player-sprite-clip"]');
  const atlas=clip?.firstElementChild;
  window.__timingFrames.push({t,id:st.actionId,phase:st.gamePhase,paused:st.isPaused,kind:st.motion?.kind,remaining:st.motion?.remaining,tile:p.currentTileId,player:p.id,bot:p.isBot,
   token:transform(token),gait:transform(document.querySelector('[data-testid="player-gait-'+p.id+'"]')),camera:transform(document.querySelector('[data-testid="camera-world"]')),
   atlas:atlas?[getComputedStyle(atlas).left,getComputedStyle(atlas).top]:null});
  const trigger=window.__pauseTrigger,f=window.__timingFrames.at(-1);
  if(trigger&&!st.isPaused&&(!trigger.kind||f.kind===trigger.kind)&&(!trigger.phase||f.phase===trigger.phase)&&(!trigger.tile||f.tile===trigger.tile)){
   trigger.firstSeen??=t;
   if(t-trigger.firstSeen>=(trigger.delay||0)&&(!trigger.minX||f.token[0]>=trigger.minX)&&(!trigger.maxX||f.token[0]<=trigger.maxX)){
    window.__pauseTrigger=null;document.querySelector('[data-testid="race-pause"]').click();
   }
  }
  requestAnimationFrame(capture);
 }requestAnimationFrame(capture);
 return initial;
})()`;
async function record(s,label) {
 const path=`${output}/${label}-frames`;await mkdir(path,{recursive:true});
 let i=0;const events=[],pending=[];
 const off=s.onEvent('Page.screencastFrame',event=>{
  const file=`${String(i++).padStart(5,'0')}.jpg`;
  events.push({file,timestamp:event.metadata.timestamp});
  pending.push(writeFile(`${path}/${file}`,Buffer.from(event.data,'base64')));
  return s.send('Page.screencastFrameAck',{sessionId:event.sessionId});
 });
 await s.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:800,maxHeight:360,everyNthFrame:1});
 return async()=>{
  await s.send('Page.stopScreencast');off();await Promise.all(pending);
  await writeFile(`${path}/timestamps.json`,JSON.stringify(events));
 };
}
function analyse(frames,dice,label) {
 const grouped=new Map();
 for(const frame of frames) if(frame.kind&&['moving','applying_effect'].includes(frame.phase)&&!frame.paused) {
  if(!grouped.has(frame.id))grouped.set(frame.id,[]);grouped.get(frame.id).push(frame);
 }
 const steps=[];
 for(const [id,samples] of grouped) {
  const start=samples[0],next=frames.find(f=>f.t>start.t&&f.id!==id);
  const duration=(next?.t??samples.at(-1).t)-start.t;
  const positions=new Set(samples.map(f=>f.token?.slice(0,2).map(n=>n.toFixed(2)).join(',')));
  const gait=new Set(samples.map(f=>JSON.stringify(f.gait)));
  const poses=new Set(samples.map(f=>JSON.stringify(f.atlas)));
  if(start.kind==='forward') {
   check(duration>=280&&duration<650,`${label} tile ${start.tile}: complete step ${duration.toFixed(1)}ms`);
   check(positions.size>=8,`${label} ${start.tile}: multiple actual positions (${positions.size})`);
   check(gait.size>=6&&poses.size>=2,`${label} ${start.tile}: full gait and both atlas poses`);
  }else if(start.kind==='shortcut') {
   check(duration>=1150&&duration<1700,`${label}: visible shortcut ${duration.toFixed(1)}ms`);
   check(positions.size>=25&&poses.size>=2,`${label}: continuous shortcut with repeated walk poses`);
  }
  // Actual local ground coordinates separate character movement from camera pan.
  for(let i=1;i<samples.length;i++) {
   const a=samples[i-1],b=samples[i],dt=b.t-a.t;
   const dist=Math.hypot(b.token[0]-a.token[0],b.token[1]-a.token[1]);
   check(dist<Math.max(12,dt*.7),`${label} ${start.tile}: no frame teleport at ${b.t.toFixed(1)}`);
  }
  steps.push({id,kind:start.kind,tile:start.tile,durationMs:+duration.toFixed(2),renderedSamples:samples.length,distinctPositions:positions.size,distinctGait:gait.size,poses:poses.size});
 }
 const main=steps.filter(s=>s.kind==='forward');
 check(main.length===dice,`${label}: exactly ${dice} sequential dice steps`);
 check(main.reduce((sum,s)=>sum+s.durationMs,0)>=dice*280,`${label}: total time grows with dice count`);
 if(dice===4) {
  const idle=frames.filter(f=>f.phase==='shortcut_pause');
  const next=idle.length&&frames.find(f=>f.t>idle[0].t&&f.kind==='shortcut');
  check(idle.length>=12&&next.t-idle[0].t>=420,`${label}: real idle beat before shortcut`);
  check(new Set(idle.map(f=>f.tile)).size===1&&idle[0].tile==='tile_4',`${label}: wait stays at entrance`);
  check(new Set(idle.map(f=>JSON.stringify(f.token))).size===1,`${label}: token stands still at entrance`);
 }
 return steps;
}
async function scenario(dice) {
 const s=await browserSession(800,360);let stop;
 try {
  console.log(`Actual UI dice ${dice}`);await enter(s,dice);
  await s.evaluate(sampler);
  await s.click('[data-testid="roll-dice-button"]');
  await wait(s,async()=>(await s.evaluate(observeRace))?.gamePhase==='showing_question');
  const q=await s.evaluate(observeRace);check(q.currentDiceValue===dice,`UI seeded dice ${dice}`);
  if([1,4,6].includes(dice))stop=await record(s,`dice-${dice}`);
  await answer(s,q.question);
  await wait(s,async()=>!!(await s.evaluate(observeRace))?.motion);
  await wait(s,async()=>{const st=await s.evaluate(observeRace);return ['turn_end','turn_handover','rolling_mystery','mystery_result'].includes(st?.gamePhase);});
  await sleep(100);await s.screenshot(`${output}/dice-${dice}-end.png`);
  await s.evaluate('window.__timingCapture=false');
  const frames=await s.evaluate('window.__timingFrames');
  await writeFile(`${output}/dice-${dice}-samples.json`,JSON.stringify(frames));
  const steps=analyse(frames,dice,`dice-${dice}`);
  check(await s.evaluate(`!document.querySelector('[data-testid="choose-shortcut"],[data-testid="choose-main"]')`),'no shortcut choice modal');
  check(s.exceptions.length===0,'no browser runtime exceptions');
  report.scenarios.push({dice,steps,totalMainMs:+steps.filter(s=>s.kind==='forward').reduce((sum,s)=>sum+s.durationMs,0).toFixed(2)});
  console.log(JSON.stringify(report.scenarios.at(-1)));
 }finally{if(stop)await stop();await s.close();}
}
async function pauseScenario() {
 const s=await browserSession(800,360);let stop;
 const st=()=>s.evaluate(observeRace);
 const last=()=>s.evaluate('window.__timingFrames.at(-1)');
 const quickClick=id=>s.evaluate(`document.querySelector('[data-testid="${id}"]').click()`);
 async function freeze(label,ms,nextTrigger=null) {
  await wait(s,async()=>(await st()).isPaused);
  await sleep(80);const frozen=await last(),snapshot=await st();
  await sleep(ms);const after=await last();
  check(JSON.stringify(await st())===JSON.stringify(snapshot),`${label}: no background state/callback advancement`);
  for(const key of ['token','gait','camera','atlas'])check(JSON.stringify(after[key])===JSON.stringify(frozen[key]),`${label}: ${key} frozen`);
  await s.screenshot(`${output}/${label}-paused.png`);
  await s.evaluate(`window.__pauseTrigger=${JSON.stringify(nextTrigger)}`);
  await quickClick('race-resume');await wait(s,async()=>!(await st()).isPaused);
  return frozen;
 }
 try {
  console.log('Actual UI pauses mid-step, at shortcut entrance and mid-shortcut');
  await enter(s,4);await s.evaluate(sampler);stop=await record(s,'pause-resume');
  await s.click('[data-testid="roll-dice-button"]');
  await wait(s,async()=>(await st()).gamePhase==='showing_question');
  await s.evaluate(`window.__pauseTrigger={kind:'forward',tile:'tile_1',minX:45,maxX:95}`);
  await answer(s,(await st()).question);
  const first=await freeze('mid-step',900,{phase:'shortcut_pause',delay:75});
  await sleep(35);const resumed=await last();
  check(resumed.id===first.id&&resumed.token[0]>=first.token[0]-.1,'resume continues first step from frozen position');
  await freeze('shortcut-entrance',900,{kind:'shortcut',minX:205,maxX:280});
  const shortcut=await freeze('mid-shortcut',700);
  await sleep(35);check((await last()).id===shortcut.id,'shortcut resumes the same action');
  await wait(s,async()=>(await st()).gamePhase==='turn_end');
  const final=await st();check(final.players[0].pathHistory.join(',')==='tile_0,tile_1,tile_2,tile_3,tile_4,tile_8_mid','all four steps and exactly one shortcut retained after three pauses');
  await s.evaluate('window.__timingCapture=false');const frames=await s.evaluate('window.__timingFrames');
  const ids=new Set(frames.filter(f=>f.kind==='shortcut').map(f=>f.id));check(ids.size===1,'shortcut activated once across pause/resume');
  const idle=frames.filter(f=>f.phase==='shortcut_pause');
  const activeIdle=idle.reduce((ms,f,i)=>ms+(i&& !f.paused&&!idle[i-1].paused?f.t-idle[i-1].t:0),0);
  check(activeIdle>=400&&activeIdle<600,`entrance active time excludes pause (${activeIdle.toFixed(1)}ms)`);
  const mainIds=[...new Set(frames.filter(f=>f.kind==='forward').map(f=>f.id))];
  check(mainIds.length===4,'pause retains exactly four main-route steps');
  for(const id of mainIds) {
   const samples=frames.filter(f=>f.id===id&&f.kind==='forward');
   check(new Set(samples.map(f=>JSON.stringify(f.atlas))).size>=2,`paused sequence action ${id}: both walk poses`);
   check(new Set(samples.map(f=>JSON.stringify(f.token))).size>=8,`paused sequence action ${id}: continuous movement`);
  }
  check(s.exceptions.length===0,'pause scenario has no browser runtime exceptions');
  await writeFile(`${output}/pause-resume-samples.json`,JSON.stringify(frames));
  report.scenarios.push({pauseResume:true,mainSteps:4,shortcuts:ids.size,activeEntranceMs:+activeIdle.toFixed(1)});
 }catch(error){await s.screenshot(`${output}/pause-failure.png`);await writeFile(`${output}/pause-debug.json`,JSON.stringify({state:await st(),frames:await s.evaluate('window.__timingFrames')}));throw error;}
 finally{if(stop)await stop();await s.close();}
}
try {
 if(pauseOnly)await pauseScenario();else for(let dice=1;dice<=6;dice++)await scenario(dice);
 report.passed=true;
}catch(error){report.passed=false;report.error=String(error);throw error;}
finally{await writeFile(`${output}/${pauseOnly?'pause-result':'result'}.json`,JSON.stringify(report,null,2));}
