import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/round37',url=process.env.GAME_URL||'http://localhost:8099';
await mkdir(out,{recursive:true});let b;const results=[];
const locate='('+function(){let f=document.querySelector('[data-testid=energy-mode-selection]');f=f?.[Object.keys(f).find(k=>k.startsWith('__reactFiber$'))];while(f){for(const candidate of[f,f.alternate]){let h=candidate?.memoizedState,engine,clock;for(let i=0;h&&i<120;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.advanceTo==='function')engine=v;if(!clock&&v&&typeof v.get==='function'&&typeof v.set==='function'&&typeof v.get()==='number')clock=v;}if(engine){window.energyQA={engine,clock};return true;}}f=f.return;}return false;}.toString()+')()';
async function wait(e){const t=Date.now();while(Date.now()-t<20000){if(await b.evaluate(e))return;await sleep(40);}throw Error('Wait '+e);}
const solve='('+function(q){
 const gcd=(a,b)=>b?gcd(b,a%b):a,add=(a,b)=>{const n=a.num*b.den+b.num*a.den,d=a.den*b.den,g=gcd(n,d);return{num:n/g,den:d/g};};
 for(let m=1;m<1<<q.availablePieces.length;m++){const p=q.availablePieces.filter((_,i)=>m&(1<<i)),s=p.reduce((a,b)=>add(a,b.fraction),{num:0,den:1});if(s.num*q.targetFraction.den===q.targetFraction.num*s.den)return p.map(x=>x.id);}throw Error('Unsolvable');
}.toString()+')';
try{
 b=await browserSession(390,844);
 for(const mode of ['easy','medium','hard']){
  await b.send('Page.navigate',{url:url+'/games/energy-defense'});await wait("!!document.querySelector('[data-testid=energy-mode-selection]')");assert(await b.evaluate(locate));
  await b.click('[data-testid=energy-mode-'+mode+']');await b.click('[data-testid=energy-start]');await wait("window.energyQA.engine.getSnapshot().status==='running'");
  const q=await b.evaluate('window.energyQA.engine.getSnapshot().problem');
  const ids=await b.evaluate(solve+'('+JSON.stringify(q)+')');
  await b.evaluate('window.energyQA.engine.advanceTo(2000);window.energyQA.clock.set(2000)');
  for(const id of ids)assert(await b.click('[data-testid=energy-crystal-'+id+']'));
  assert(await b.click('[data-testid=energy-fire]'));await wait('window.energyQA.engine.getSnapshot().kills===1');
  assert.equal(await b.evaluate('window.energyQA.engine.getSnapshot().hp'),100);
  const result=await b.evaluate('('+function(solve){const c=window.energyQA.engine,questions=[],types=new Set();let loops=0;
   while(c.getSnapshot().status==='running'&&loops++<3000){const s=c.getSnapshot();
    if(s.enemies.length&&!s.shot){const ids=solve(s.problem);questions.push(s.problem.id);types.add(s.problem.questionType);for(const id of ids)c.toggle(id);if(!c.fire())throw Error('Valid generated answer rejected');}
    c.advanceTo(c.now+1000);
   }
   window.energyQA.clock.set(c.now);return{status:c.getSnapshot().status,hp:c.getSnapshot().hp,kills:c.getSnapshot().kills,loops,questions:questions.length,types:[...types],elapsed:c.now};
  }.toString()+')('+solve+')');
  assert.equal(result.hp,100);assert.equal(result.status,mode==='hard'?'offer':'won');results.push({mode,...result});
  if(mode==='hard'){
   const endless=await b.evaluate('('+function(solve){const c=window.energyQA.engine;c.acceptEndless(true);let loops=0;
    while(c.getSnapshot().wave<8&&c.getSnapshot().status==='running'&&loops++<5000){const s=c.getSnapshot();if(s.enemies.length&&!s.shot){for(const id of solve(s.problem))c.toggle(id);if(!c.fire())throw Error('Endless rejected');}c.advanceTo(c.now+1000);}
    window.energyQA.clock.set(c.now);return c.getSnapshot();
   }.toString()+')('+solve+')');
   assert.equal(endless.wave,8);assert.equal(endless.hp,100);assert.equal(endless.endlessScore,endless.endlessKills*10);results.push({mode:'endless',wave:endless.wave,score:endless.endlessScore,kills:endless.endlessKills});
  }
 }
 // Persisted history is inspected after a full document reload, not just a new controller.
 const old=await b.evaluate("JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('questions:v1'))))");assert(old.groups['energy:warmup'].length>0);
 await b.send('Page.reload');await wait("!!document.querySelector('[data-testid=energy-mode-selection]')");assert(await b.evaluate(locate));
 await b.click('[data-testid=energy-start]');await wait("window.energyQA.engine.getSnapshot().status==='running'");
 const fresh=await b.evaluate('window.energyQA.engine.getSnapshot().problem');
 const fp='energy:'+fresh.targetFraction.num+'/'+fresh.targetFraction.den+':'+fresh.availablePieces.filter(p=>['p0','p1'].includes(p.id)).map(p=>p.fraction.num+'/'+p.fraction.den).sort().join('+');
 assert(!old.groups['energy:warmup'].includes(fp));assert.deepEqual(b.exceptions,[]);
 results.push({persistedAcrossReload:true});
}finally{if(b)await b.close();await writeFile(out+'/energy-web.json',JSON.stringify({platform:'Chrome production web; one UI answer per mode then accelerated authoritative controller clock for progression/endless; not native',results},null,2));}
