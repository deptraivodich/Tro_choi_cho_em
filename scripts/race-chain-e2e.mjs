import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { browserSession, observeRace, sleep } from './lib/cdp.mjs';
const output='artifacts/race-chained-effects';
await mkdir(output,{recursive:true});
const report={platform:'Chrome web landscape 800x360, normal motion; NOT Android native',checks:[],scenarios:[]};
const check=(value,label)=>{assert.ok(value,label);report.checks.push(label);};
async function wait(predicate,timeout=120000) {
  const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await sleep(30);}
  throw Error('UI condition timed out');
}
async function textClick(s,text) {
  await s.evaluate(`(()=>{
    document.querySelectorAll('[data-chain-click]').forEach(e=>e.removeAttribute('data-chain-click'));
    const nodes=[...document.querySelectorAll('div,button')].filter(e=>e.textContent.includes(${JSON.stringify(text)})&&e.getBoundingClientRect().width);
    nodes.sort((a,b)=>a.textContent.length-b.textContent.length);
    const leaf=nodes[0],e=leaf&&(leaf.closest('[role="button"],[tabindex="0"]')||leaf);
    if(!e)throw Error('UI text not found');e.setAttribute('data-chain-click','1');
  })()`);
  check(await s.click('[data-chain-click="1"]'),`click ${text}`);
}
async function answer(s,q) {
  if(q.choices)await textClick(s,q.answer);
  else {
    await s.evaluate(`(()=>{const e=document.querySelector('[data-testid="math-answer-input"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(`${q.answer.n}/${q.answer.d}`)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await sleep(70);await s.click('[data-testid="math-submit"]');
  }
}
const observer=`(()=>{
  const e=document.querySelector('[data-testid^="token-"]');let fiber=e[Object.keys(e).find(k=>k.startsWith('__reactFiber$'))],controller;
  while(fiber&&!controller){let h=fiber.memoizedState;for(let i=0;h&&i<100;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.startGame==='function'){controller=v;break;}}fiber=fiber.return;}
  if(!controller)throw Error('Store unavailable');
  window.__chainEvents=[];window.__chainFrames=[];window.__chainCapture=true;window.__chainPauseTriggers=[];
  const snapshot=()=>{const st=controller.getSnapshot(),p=st.players[0];return {t:performance.now(),id:st.actionId,phase:st.gamePhase,paused:st.isPaused,
    active:st.activePlayerIndex,turn:st.turnId,tile:p.currentTileId,motion:st.motion,chain:st.effectChain,mystery:st.mysteryRollState,history:p.pathHistory};};
  window.__chainUnsubscribe=controller.subscribe(()=>window.__chainEvents.push(snapshot()));
  function matrix(e){if(!e)return null;const m=new DOMMatrixReadOnly(getComputedStyle(e).transform);return [m.m41,m.m42,m.a,m.b,m.c,m.d];}
  function capture(){
    if(!window.__chainCapture)return;
    const f=snapshot(),p=controller.getSnapshot().players[0],token=document.querySelector('[data-testid="token-'+p.id+'"]');
    const atlas=token?.querySelector('[data-testid="player-sprite-clip"]')?.firstElementChild;
    const roll=document.querySelector('[data-testid="roll-dice-button"]');
    f.token=matrix(token);f.gait=matrix(document.querySelector('[data-testid="player-gait-'+p.id+'"]'));
    f.camera=matrix(document.querySelector('[data-testid="camera-world"]'));f.reel=matrix(document.querySelector('[data-testid="mystery-reel-track"]'));
    f.poses=atlas?[getComputedStyle(atlas).left,getComputedStyle(atlas).top]:null;
    f.modalCount=document.querySelectorAll('[data-testid="mystery-title"]').length;
    f.title=document.querySelector('[data-testid="mystery-title"]')?.textContent;
    f.result=document.querySelector('[data-testid="mystery-result"]')?.textContent;
    f.rollEnabled=!!roll&&roll.getAttribute('aria-disabled')!=='true';
    window.__chainFrames.push(f);
    const trigger=window.__chainPauseTriggers[0];
    if(trigger&&!f.paused&&f.phase===trigger.phase&&(!trigger.cause||f.motion?.cause===trigger.cause)){
      trigger.start??=f.t;
      if(f.t-trigger.start>=trigger.after){window.__chainPauseTriggers.shift();document.querySelector('[data-testid="race-pause"]').click();}
    }
    requestAnimationFrame(capture);
  }requestAnimationFrame(capture);
})()`;
async function record(s,label) {
  const folder=`${output}/${label}-frames`;await mkdir(folder,{recursive:true});
  const events=[],pending=[];let i=0;
  const off=s.onEvent('Page.screencastFrame',e=>{
    const file=`${String(i++).padStart(5,'0')}.jpg`;events.push({file,timestamp:e.metadata.timestamp});
    pending.push(writeFile(`${folder}/${file}`,Buffer.from(e.data,'base64')));
    return s.send('Page.screencastFrameAck',{sessionId:e.sessionId});
  });
  await s.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:800,maxHeight:360,everyNthFrame:1});
  return async()=>{await s.send('Page.stopScreencast');off();await Promise.all(pending);await writeFile(`${folder}/timestamps.json`,JSON.stringify(events));};
}
async function scenario(label,seed,expected,pauses) {
  const s=await browserSession(800,360);let stop;
  const state=()=>s.evaluate(observeRace);
  try {
    console.log(`Chain UI ${label}, seed ${seed}`);
    await s.send('Page.addScriptToEvaluateOnNewDocument',{source:`Math.random=()=>${seed}/0xffffffff;`});
    await s.send('Page.navigate',{url:process.env.GAME_URL||'http://127.0.0.1:8090'});
    await wait(()=>s.evaluate(`!!document.querySelector('[data-testid="game-card-play-race-to-finish"]')`));
    await s.click('[data-testid="game-card-play-race-to-finish"]');
    await wait(()=>s.evaluate(`!!document.querySelector('[data-testid="start-race-button"]')&&document.querySelector('[data-testid="start-race-button"]').getAttribute('aria-disabled')!=='true'`));
    await textClick(s,'Chơi cùng bạn');await textClick(s,'2 Người chơi');
    await s.click('[data-testid="race-setup-character-0-bunny"]');await s.click('[data-testid="start-race-button"]');
    await wait(async()=>!!await state()&&!(await state()).isPaused);await s.evaluate(observer);
    if(pauses)await s.evaluate(`window.__chainPauseTriggers=[{phase:'mystery_result',after:250},{phase:'applying_effect',cause:'bonus',after:90}]`);
    await s.click('[data-testid="roll-dice-button"]');await wait(async()=>(await state()).gamePhase==='showing_question');
    stop=await record(s,label);await answer(s,(await state()).question);
    const screenshots=new Set();let pauseCount=0;
    await wait(async()=>{
      const st=await state();
      if(st.isPaused) {
        pauseCount++;await sleep(100);const frozen=await state(),frame=await s.evaluate('window.__chainFrames.at(-1)');
        await sleep(700);const after=await s.evaluate('window.__chainFrames.at(-1)');
        check(JSON.stringify(await state())===JSON.stringify(frozen),`${label}: pause ${pauseCount} freezes engine/context`);
        for(const key of ['token','gait','camera','reel','poses'])check(JSON.stringify(frame[key])===JSON.stringify(after[key]),`${label}: pause ${pauseCount} freezes ${key}`);
        await s.screenshot(`${output}/${label}-pause-${pauseCount}.png`);
        await s.evaluate(`document.querySelector('[data-testid="race-resume"]').click()`);
      }
      if(st.gamePhase==='mystery_result'&&!screenshots.has(st.mysteryRollState.id)) {
        screenshots.add(st.mysteryRollState.id);await s.screenshot(`${output}/${label}-effect-${screenshots.size}.png`);
      }
      return ['turn_end','turn_handover'].includes(st.gamePhase);
    });
    await sleep(100);const final=await state();await s.screenshot(`${output}/${label}-end.png`);
    const captured=await s.evaluate(`(()=>{window.__chainCapture=false;window.__chainUnsubscribe();return {events:window.__chainEvents,frames:window.__chainFrames}})()`);
    await writeFile(`${output}/${label}-samples.json`,JSON.stringify(captured));
    const effects=captured.events.filter(e=>e.phase==='rolling_mystery'&&!e.paused);
    const uniqueEffects=[...new Map(effects.map(e=>[e.mystery.id,e])).values()];
    check(uniqueEffects.length===2,`${label}: exactly two reels, no repeated tile activation`);
    check(JSON.stringify(uniqueEffects.map(e=>[e.mystery.type,e.mystery.result]))===JSON.stringify(expected),`${label}: expected effect sequence`);
    check(new Set(uniqueEffects.map(e=>e.chain.id)).size===1,`${label}: one chain identity across both effects`);
    check(uniqueEffects.every(e=>e.turn===1&&e.active===0),`${label}: same player and turn throughout chain`);
    check(final.players[0].currentTileId==='tile_4_bonus'&&final.effectChain===null,`${label}: correct final tile; context clears only at end`);
    check(pauseCount===(pauses?2:0),`${label}: expected pauses completed`);
    const frames=captured.frames;
    check(frames.every(f=>f.modalCount<=1),`${label}: never two reward/penalty modals`);
    check(frames.filter(f=>f.chain).every(f=>!f.rollEnabled),`${label}: roll stays disabled throughout chain`);
    for(const e of uniqueEffects) {
      const arrived=captured.events.find(f=>f.id===e.id-1);
      check(arrived?.phase==='evaluating_tile'&&!arrived.motion,`${label}: reel ${e.id} waits for final movement completion`);
      check(frames.some(f=>f.mystery?.id===e.mystery.id&&f.title===(e.mystery.type==='bonus'?'Ô Thưởng Bí Ẩn':'Ô Phạt Bí Ẩn')),`${label}: correct second modal is actually rendered`);
    }
    const effectMoves=captured.events.filter(e=>e.motion&&['bonus','penalty'].includes(e.motion.cause));
    const moves=[];
    for(const id of new Set(effectMoves.map(e=>e.id))) {
      const samples=frames.filter(f=>f.id===id&&f.motion);
      const distinct=new Set(samples.map(f=>JSON.stringify(f.token))),poses=new Set(samples.map(f=>JSON.stringify(f.poses)));
      check(distinct.size>=8&&poses.size>=2,`${label}: effect action ${id} has continuous walking with both poses`);
      for(let i=1;i<samples.length;i++)if(JSON.stringify(samples[i].token)!==JSON.stringify(samples[i-1].token))
        check(samples[i].modalCount===0,`${label}: no reel during actual movement at ${samples[i].t.toFixed(1)}`);
      const ended=captured.events.find(e=>e.id>id),start=effectMoves.find(e=>e.id===id);
      let pausedMs=0,pauseStart=null;
      for(const e of captured.events.filter(e=>e.id===id)){
        if(e.paused&&pauseStart===null)pauseStart=e.t;
        else if(!e.paused&&pauseStart!==null){pausedMs+=e.t-pauseStart;pauseStart=null;}
      }
      const activeMs=ended.t-start.t-pausedMs;
      check(activeMs>=280&&activeMs<700,`${label}: per-step clock retained (${activeMs.toFixed(1)}ms including callback)`);
      moves.push({id,cause:start.motion.cause,tile:start.tile,activeMs,positions:distinct.size,poses:poses.size});
    }
    if(label==='penalty-bonus')check(final.players[0].hasShield,`${label}: shield granted once after the second reel`);
    check(!await s.evaluate(`!!document.querySelector('[data-testid="choose-shortcut"],[data-testid="choose-main"]')`),`${label}: no route-choice modal`);
    check(s.exceptions.length===0,`${label}: no browser exceptions`);
    report.scenarios.push({label,seed,effects:uniqueEffects.map(e=>e.mystery),moves,pauseCount,finalTile:final.players[0].currentTileId});
    console.log(`PASS ${label}: ${moves.length} chained movement actions`);
  }catch(error){await s.screenshot(`${output}/${label}-failure.png`);throw error;}
  finally{if(stop)await stop();await s.close();}
}
try {
  await scenario('bonus-penalty-cycle',20,[['bonus','advance_1'],['penalty','retreat_1']],true);
  await scenario('penalty-bonus',286,[['penalty','retreat_1'],['bonus','shield']],false);
  report.passed=true;
}catch(error){report.passed=false;report.error=String(error);throw error;}
finally{await writeFile(`${output}/result.json`,JSON.stringify(report,null,2));}
