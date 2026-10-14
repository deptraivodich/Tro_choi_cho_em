import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, sleep } from './lib/cdp.mjs';

const output=path.resolve('artifacts/supercar/acceptance');
await mkdir(output,{recursive:true});
const observe=`(() => {
 const element=document.querySelector('[data-testid^="supercar-state-"]');if(!element)return null;
 const key=Object.keys(element).find(k=>k.startsWith('__reactFiber$'));let fiber=element[key];
 let model,world,audio;
 for(let depth=0;fiber&&depth<12;depth++,fiber=fiber.return){
  let hook=fiber.memoizedState;
  for(let i=0;hook&&i<80;i++,hook=hook.next){
   const value=hook.memoizedState;
   if(value&&typeof value==='object'){
    const shared=value.value ?? value.current?.value;
    if(shared?.phase&&shared?.session)model=shared;
    if(shared?.hero&&typeof shared?.C==='number')world=shared;
    if(value.current?.players&&typeof value.current.setEnabled==='function'){
     const a=value.current;audio={enabled:a.enabled,suspended:a.suspended,disposed:a.disposed,error:a.error,
       players:Object.fromEntries(Object.entries(a.players).map(([name,p])=>[name,{playing:p.playing,time:p.currentTime,loop:p.loop,volume:p.volume}]))};
    }
   }
  }
 }
 if(!model||!world)return null;
 const rect=id=>document.querySelector('[data-testid="'+id+'"]')?.getBoundingClientRect().toJSON();
 return {model,world,audio,hero:rect('supercar-hero'),police:rect('supercar-police'),
  panel:rect('supercar-question'),victory:!!document.querySelector('[data-testid="supercar-victory"]'),
  loss:!!document.querySelector('[data-testid="supercar-loss"]'),body:document.body.innerText};
})()`;

async function waitFor(browser,predicate,limit=12000){
 const start=Date.now();let value;
 while(Date.now()-start<limit){value=await browser.evaluate(observe);if(value&&predicate(value))return value;await sleep(40);}
 throw new Error('Timed out: '+JSON.stringify(value));
}
async function run(label,width,height){
 const browser=await browserSession(width,height);
 const folder=path.join(output,label+'-frames');await mkdir(folder,{recursive:true});
 const writes=[],timestamps=[],trace=[];let sequence=0,stopEvents;
 try{
  await browser.send('Page.navigate',{url:'http://127.0.0.1:8093/games/terrain-racing'});
  await waitFor(browser,s=>s.model.time>0);
  stopEvents=browser.onEvent('Page.screencastFrame',async event=>{
   const file=String(sequence++).padStart(6,'0')+'.jpg';
   timestamps.push({file,timestamp:event.metadata.timestamp});
   writes.push(writeFile(path.join(folder,file),Buffer.from(event.data,'base64')));
   await browser.send('Page.screencastFrameAck',{sessionId:event.sessionId});
  });
  await browser.send('Page.startScreencast',{format:'jpeg',quality:72,everyNthFrame:2});
  const phases=[],shots=new Set();let previous,waitQuestion=0,answerStage=0,paused=false,soundTested=false,checks=0,rollPaused=false,chasePaused=false;
  const start=Date.now();
  while(Date.now()-start<115000){
   const s=await browser.evaluate(observe);assert(s,'Missing simulation');
   const {model:m,world:w}=s;trace.push({at:Date.now()-start,model:m,world:w,hero:s.hero,police:s.police});
   if(previous&&m.session===previous.model.session&&!m.paused){
    for(const field of ['H','P','C'])assert(w[field]>=previous.world[field]-.001,'World reversed: '+field);
   }
   assert(s.police.top-s.hero.bottom>-.1,'Sprite boxes overlapped');
   assert.equal(s.audio.error,null,'Audio adapter reported an error');checks++;
   const key=m.phase+'-'+m.stage;
   if(phases.at(-1)!==key){phases.push(key);console.log(label,key);}
   if(!shots.has(key)&&['question','jump','transition','policeRoll','escape','result','victory'].includes(m.phase)){
    shots.add(key);await browser.screenshot(path.join(output,label+'-'+key+'.png'));
   }
   if(label==='pause-resume'&&!soundTested){
    assert.equal(s.audio.enabled,false);assert(Object.values(s.audio.players).every(p=>!p.playing),'Sound was not muted');
    await browser.click('[data-testid="supercar-sound"]');soundTested=true;
   }
   if(label==='pause-roll'&&m.phase==='chase'&&!chasePaused){
    chasePaused=true;await browser.click('[data-testid="supercar-pause"]');
    const frozen=await waitFor(browser,s=>s.model.paused);await sleep(700);
    assert.deepEqual((await browser.evaluate(observe)).world,frozen.world);
    await browser.click('[data-testid="supercar-resume"]');await waitFor(browser,s=>!s.model.paused);
   }
   if(label==='pause-roll'&&m.phase==='policeRoll'&&!rollPaused){
    rollPaused=true;
    await browser.evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));`);
    const frozen=await waitFor(browser,s=>s.model.paused);await sleep(1500);
    assert.deepEqual((await browser.evaluate(observe)).world,frozen.world);
    await browser.evaluate(`delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));`);
    assert((await browser.evaluate(observe)).model.paused,'Foreground must wait for user resume');
    await browser.screenshot(path.join(output,'background-police-roll.png'));
    await browser.click('[data-testid="supercar-resume"]');await waitFor(browser,s=>!s.model.paused);
   }
   if(label==='pause-resume'&&m.phase==='jump'&&!paused){
    paused=true;await browser.click('[data-testid="supercar-pause"]');
    const frozen=await waitFor(browser,s=>s.model.paused);
    assert(Object.values(frozen.audio.players).every(p=>!p.playing),'Pause leaked sound');
    await browser.screenshot(path.join(output,'pause-resume-paused.png'));await sleep(1100);
    const after=await browser.evaluate(observe);assert.deepEqual(after.world,frozen.world);assert.deepEqual(after.model,frozen.model);
    await browser.click('[data-testid="supercar-resume"]');await waitFor(browser,s=>!s.model.paused);
   }
   if(m.phase==='question'&&m.stage!==answerStage){
    if(!waitQuestion)waitQuestion=Date.now();
    const delay=label==='five-stages'?1500:label==='small-phone'?1500:300;
    if(Date.now()-waitQuestion>=delay){
     const options=await browser.evaluate(`Array.from(document.querySelectorAll('[data-testid^="supercar-answer-"]')).map(e=>({id:e.dataset.testid,rect:e.getBoundingClientRect().toJSON()}))`);
     assert.equal(options.length,4);
     for(const o of options){assert(o.rect.height>=48);assert(o.rect.x>=0&&o.rect.right<=width+.1);assert(o.rect.bottom<=height+.1);}
     assert(s.panel.top>s.police.bottom,'Question covered police');
     const speed=label==='low-speed'?m.target-10:label==='high-speed'?m.target+10:m.target;
     await browser.click('[data-testid="supercar-answer-'+speed+'"]');
     // A real immediate second tap must not start another outcome.
     await browser.click('[data-testid="supercar-answer-'+(m.target+10)+'"]');
     const chosen=await waitFor(browser,s=>s.model.phase!=='question');assert.equal(chosen.model.speed,speed);
     answerStage=m.stage;waitQuestion=0;
    }
   }
   previous=s;
   if(label==='small-phone'&&answerStage===1)break;
   if(label==='pause-resume'&&paused&&m.phase==='transition'){
    await browser.click('[data-testid="supercar-pause"]');const frozen=await waitFor(browser,s=>s.model.paused);
    await sleep(500);assert.deepEqual((await browser.evaluate(observe)).world,frozen.world);
    await browser.click('[data-testid="supercar-exit"]');await sleep(700);
    assert(!(await browser.evaluate(`!!document.querySelector('[data-testid^="supercar-state-"]')`)));
    assert(await browser.evaluate('Array.from(document.querySelectorAll("audio")).every(a=>a.paused)'),'Audio leak after exit');
    // Enter once more through the real lobby card; no callback from the previous session.
    assert(await browser.click('[data-testid="game-card-play-terrain-racing"]'),'Lobby game card not found');
    const fresh=await waitFor(browser,s=>s.model.stage===1&&s.model.phase==='chase');assert.equal(fresh.model.speed,20);break;
   }
   if(m.phase==='result'){
    assert(s.loss);assert(s.body.includes('v = 60 : 3 = 20 m/s'));
    assert.equal(m.outcome,label==='low-speed'?'low':'high');
    if(label==='low-speed'){assert.equal(w.hero.alpha,0);assert(w.H<w.gap+89);}
    else{assert.equal(w.hero.frame,2);assert(w.H>w.gap+89);}
    await sleep(500);await browser.click('[data-testid="supercar-replay"]');
    const fresh=await waitFor(browser,s=>s.model.session===2);assert.equal(fresh.model.stage,1);break;
   }
   if(m.phase==='victory'){
    assert.equal(m.stage,5);assert.equal(m.completed,5);assert.equal(w.police.frame,2);assert(w.P>w.gap+89);
    assert(s.hero.bottom<0,'Victory before full yellow sprite exit');assert(s.victory);
    assert.deepEqual(phases.slice(-4),['policeJump-5','policeRoll-5','escape-5','victory-5']);
    await sleep(800);break;
   }
   await sleep(50);
  }
  assert(checks>10);if(label==='five-stages')assert(phases.includes('victory-5'));
  assert.equal(browser.exceptions.length,0,browser.exceptions.join('\n'));
  await browser.send('Page.stopScreencast');stopEvents();await Promise.all(writes);
  await writeFile(path.join(folder,'timestamps.json'),JSON.stringify(timestamps));
  await writeFile(path.join(output,label+'-trace.json'),JSON.stringify(trace));
  return {label,width,height,phases,checks,capturedFrames:timestamps.length,elapsedSeconds:(Date.now()-start)/1000,platform:'Chrome web mobile emulation; not native Android'};
 }finally{stopEvents?.();await browser.close();}
}
const requested=process.argv.slice(2);
const labels=requested.length?requested:['small-phone','low-speed','high-speed','pause-resume','five-stages'];
const results=[];
for(const label of labels)results.push(await run(label,label==='small-phone'?320:390,label==='small-phone'?568:844));
await writeFile(path.join(output,'e2e'+(requested.length?'-'+requested.join('-'):'')+'.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
