import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/round37',url=process.env.GAME_URL||'http://localhost:8099';
await mkdir(out,{recursive:true});
const observe='('+function(){
 const e=document.querySelector('[data-testid^=supercar-state-]');if(!e)return null;
 let f=e[Object.keys(e).find(k=>k.startsWith('__reactFiber$'))],model,world,question;
 while(f){let h=f.memoizedState;for(let i=0;h&&i<100;i++,h=h.next){const v=h.memoizedState;
  if(v?.correct_speed&&v?.sample_choices)question=v;
  if(v&&typeof v==='object'){let x;try{x=typeof v.get==='function'?v.get():v.value??v.current?.value;}catch{continue;}if(x?.phase&&x?.session)model=x;if(x?.hero&&typeof x.C==='number')world=x;}
 }f=f.return;}
 return model&&world?{model,world,question,body:document.body.innerText}:null;
}.toString()+')()';
const results=[];let b;
async function wait(predicate,limit=15000){const start=Date.now();while(Date.now()-start<limit){const s=await b.evaluate(observe);if(s&&predicate(s))return s;await sleep(40);}throw Error('Terrain wait timed out');}
try{
 for(const scenario of ['low','high','five-stages']){
  b=await browserSession(390,844);await b.send('Page.navigate',{url:url+'/games/terrain-racing'});
  await wait(s=>s.model.time>0);
  const phases=[],questions=[],seen=new Set();let count=0;
  const start=Date.now();
  while(Date.now()-start<110000){
   const s=await b.evaluate(observe);if(!s){await sleep(40);continue;}const m=s.model,w=s.world,q=s.question,key=m.phase+'-'+m.stage;
   if(phases.at(-1)!==key){phases.push(key);console.log(scenario,key);}
   if(m.phase==='question'&&!seen.has(m.stage)){
    seen.add(m.stage);assert(q,'Generated question not bound to panel');assert.equal(q.stage,m.stage);assert.equal(q.distance,q.time*m.target);
    assert(q.sample_choices.includes(m.target));assert.equal(new Set(q.sample_choices).size,4);
    const panel=await b.evaluate("document.querySelector('[data-testid=supercar-question]').textContent");assert(panel.includes(q.distance+' m')&&panel.includes(q.time+' s'));
    questions.push(q);const speed=scenario==='low'?q.sample_choices.find(v=>v<m.target):scenario==='high'?q.sample_choices.find(v=>v>m.target):m.target;
    assert(await b.click('[data-testid=supercar-answer-'+speed+']'));count++;
    await wait(r=>r.model.phase!=='question');
   }
   if(m.phase==='result'){
    assert.equal(m.outcome,scenario);assert(s.body.includes(`v = ${q.distance} : ${q.time} = ${q.correct_speed} m/s`));
    if(scenario==='low'){assert.equal(w.hero.alpha,0);assert(w.H<w.gap+89);}else{assert.equal(w.hero.frame,2);assert(w.H>w.gap+89);}
    const old=q.distance+':'+q.time;await b.click('[data-testid=supercar-replay]');const replay=await wait(r=>r.model.session===2&&r.model.phase==='question');
    assert.notEqual(replay.question.distance+':'+replay.question.time,old);
    await sleep(100);await b.send('Page.reload');const reloaded=await wait(r=>r.model.phase==='question');
    assert.notEqual(reloaded.question.distance+':'+reloaded.question.time,old);assert.notEqual(reloaded.question.distance,replay.question.distance);
    results.push({scenario,passed:true,count,phases,questions,persistedAcrossReload:true});break;
   }
   if(m.phase==='victory'){
    assert.equal(m.completed,5);assert.equal(m.stage,5);assert.equal(w.police.frame,2);
    assert.deepEqual(phases.slice(-4),['policeJump-5','policeRoll-5','escape-5','victory-5']);
    assert.equal(questions.length,5);results.push({scenario,passed:true,count,phases,questions,seconds:(Date.now()-start)/1000});break;
   }
   await sleep(40);
  }
  assert(results.some(r=>r.scenario===scenario),'Scenario did not finish');assert.deepEqual(b.exceptions,[]);await b.close();b=null;
 }
}finally{if(b)await b.close();await writeFile(out+'/terrain-web.json',JSON.stringify({platform:'Chrome web, real-time simulation; no clock overrides; not native',results},null,2));}
