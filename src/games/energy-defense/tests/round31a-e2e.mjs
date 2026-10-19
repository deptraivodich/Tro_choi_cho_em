// Focused UI checks only: no stress fixture, performance sampling or sprite changes.
// Usage: node .../round31a-e2e.mjs before|after [production export directory]
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { browserSession, sleep } from '../../../../scripts/lib/cdp.mjs';

const phase=process.argv[2]||'after';
const root=path.resolve(process.argv[3]||'artifacts/energy-defense-round31a/web-dist');
const folder='artifacts/energy-defense-round31a/'+phase;
await mkdir(folder,{recursive:true});
const report={phase,checks:[],viewports:[],consoleErrors:[],exceptions:[]};
const q=id=>'[data-testid="'+id+'"]';
function check(name,passed,detail){report.checks.push({name,passed,detail});if(phase==='after')assert.ok(passed,name+' '+JSON.stringify(detail));}
const server=http.createServer(async(req,res)=>{
 try{
  let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  let data;try{data=await readFile(file);}catch{file=path.join(root,'index.html');data=await readFile(file);}
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(500);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/games/energy-defense`;
let b;
const historyKey='@tro_choi_cho_em:energy-defense:endless:v1';
const records=Array.from({length:12},(_,i)=>({id:'round31a-ui-'+i,playedAt:'2026-10-16T15:21:18.000Z',score:300+i*10,kills:30+i,completedWave:3,durationSeconds:55+i,reason:'exit'}));
const locate='('+function(){
 let f=document.querySelector('[data-testid="energy-mode-selection"]');
 f=f?.[Object.keys(f).find(k=>k.startsWith('__reactFiber$'))];
 while(f){for(const candidate of[f,f.alternate]){let h=candidate?.memoizedState,engine,clock;
  for(let i=0;h&&i<120;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.advanceTo==='function')engine=v;if(!clock&&v&&typeof v.get==='function'&&typeof v.set==='function'&&typeof v.get()==='number')clock=v;}
  if(engine){window.energyQA={engine,clock};return true;}
 }f=f.return;}return false;
}.toString()+')()';
async function wait(expression){const start=Date.now();while(Date.now()-start<20000){if(await b.evaluate(expression))return;await sleep(60);}throw new Error('Timed out: '+expression);}
async function open(){await b.send('Page.navigate',{url});await wait('!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');assert.ok(await b.evaluate(locate));}
async function start(mode){await b.click(q('energy-mode-'+mode));await b.click(q('energy-start'));await wait('!!document.querySelector('+JSON.stringify(q('energy-console'))+')');await wait('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');}
const rectFunction='s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}';
async function dialogMetrics(){return b.evaluate(`(()=>{const e=document.querySelector('[data-testid=energy-dialog]');const card=document.querySelector('[data-testid=energy-dialog-card]')||e.firstElementChild;const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};let opacity=1;for(let a=card;a;a=a.parentElement)opacity*=Number(getComputedStyle(a).opacity);return{opacity,card:rect(card),background:getComputedStyle(card).backgroundColor,body:rect(e),documentWidth:document.documentElement.scrollWidth,scrollable:Array.from(card.querySelectorAll('div')).some(e=>e.scrollHeight>e.clientHeight+5&&getComputedStyle(e).overflowY==='auto')};})()`);}
async function modalCheck(name,w,h){
 const immediate=await dialogMetrics();
 check(name+' is fully opaque as soon as mounted',immediate.opacity===1,immediate);
 await sleep(350);
 const settled=await dialogMetrics();
 check(name+' has solid card and fits viewport',settled.background==='rgb(252, 252, 241)'&&settled.card.x>=0&&settled.card.y>=0&&settled.card.right<=w&&settled.card.bottom<=h&&settled.documentWidth<=w,settled);
 await b.screenshot(folder+'/'+name+'.png');
 return settled;
}
try{
 b=await browserSession(1440,1000);
 b.onEvent('Runtime.consoleAPICalled',e=>{if(e.type==='error')report.consoleErrors.push(e.args.map(a=>a.description||a.value).join(' '));});
 await open();await b.evaluate(`localStorage.setItem(${JSON.stringify(historyKey)},${JSON.stringify(JSON.stringify(records))})`);
 for(const[name,w,h]of[['desktop',1440,1000],['mobile-320',320,640],['mobile-360',360,640],['mobile-390',390,844],['mobile-412',412,915],['tablet',768,1024],['landscape',844,390]]){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:true,deviceScaleFactor:1});await open();
  const stored=await b.evaluate('localStorage.getItem('+JSON.stringify(historyKey)+')');
  await b.click(q('energy-history-open'));await wait('document.querySelectorAll('+JSON.stringify(q('energy-history-record'))+').length===12');
  const history=await modalCheck(name+'-history',w,h);
  const closeSelector=phase==='after'?q('energy-history-close'):'[aria-label="ĐÓNG LỊCH SỬ"]';
  const close=await b.evaluate('('+rectFunction+')('+JSON.stringify(closeSelector)+')');
  check(name+' history close stays visible',close.y>=0&&close.bottom<=h,close);
  if(phase==='after'){
   await b.evaluate('Array.from(document.querySelectorAll("[data-testid=energy-history-record]")).at(-1).scrollIntoView({block:"end"})');
   const last=await b.evaluate('(()=>{const e=Array.from(document.querySelectorAll("[data-testid=energy-history-record]")).at(-1),r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,text:e.innerText};})()');
   const footer=await b.evaluate('('+rectFunction+')('+JSON.stringify(closeSelector)+')');
   check(name+' long history scrolls to its last entry without hiding Close',last.top>=0&&last.bottom<=footer.y&&footer.bottom<=h,last);
   if(w===320)await b.screenshot(folder+'/'+name+'-history-last.png');
  }
  // Touch the Start button's location behind the dialog, including outside the card.
  const button=await b.evaluate('('+rectFunction+')('+JSON.stringify(q('energy-start'))+')');
  const point={x:Math.min(w-2,button.x+button.width/2),y:Math.min(h-2,button.y+button.height/2)};
  check(name+' scrim intercepts input',await b.evaluate(`(()=>{const e=document.elementFromPoint(${point.x},${point.y});return !!e?.closest('[data-testid=energy-dialog]');})()`));
  await b.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1,force:1}]});await b.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  check(name+' history blocks background start',await b.evaluate('window.energyQA.engine.getSnapshot().status==="select"'));
  check(name+' history does not rewrite stored data',stored===await b.evaluate('localStorage.getItem('+JSON.stringify(historyKey)+')'));
  await b.click(closeSelector);
  for(const mode of['medium','hard']){
   await open();await start(mode);
   await b.evaluate('('+function(mode){const c=window.energyQA.engine;
    const pieces=mode==='medium'?[['a','1,50 (3/2)',3,2],['b','1,25 (5/4)',5,4],['c','3/4',3,4],['d','1/2',1,2],['e','1,00',1,1]]:[['a','1 1/2 (1,50)',3,2],['b','3/4',3,4],['c','1/2',1,2],['d','1/4',1,4],['e','1,00',1,1],['f','1/8',1,8]];
    const hard=mode==='hard';c.publish({problem:{id:'round31a-math',difficulty:mode,targetDisplay:hard?'2 1/4 (2,25)':'2,75 (11/4)',targetFraction:{num:hard?9:11,den:4},targetNumeric:hard?2.25:2.75,availablePieces:pieces.map(([id,display,num,den])=>({id,display,fraction:{num,den},numericVal:num/den})),explanation:'',questionType:hard?'mixed_combo':'hundredths_fractions',validCombosCount:1},selected:[],feedback:null});
   }.toString()+')('+JSON.stringify(mode)+')');
   await b.click(q('energy-crystal-a'));await b.click(q('energy-crystal-b'));
   const math=await b.evaluate(`(()=>{const rect=${rectFunction};const expression=document.querySelector('[data-testid=energy-expression]');return{expression:expression.innerText,labels:Array.from(expression.querySelectorAll('[aria-label]')).map(e=>e.getAttribute('aria-label')),battle:rect('[data-testid=energy-combat-viewport]'),fire:rect('[data-testid=energy-fire]'),crystals:Array.from(document.querySelectorAll('[data-testid^=energy-crystal-]')).map(e=>rect('[data-testid="'+e.dataset.testid+'"]')),documentWidth:document.documentElement.scrollWidth};})()`);
   check(name+' '+mode+' has no equivalent helper labels',!math.expression.includes('('),math);
   if(mode==='medium')check(name+' decimal addition displays 2,75',math.labels.at(-1)==='2,75',math.labels);
   else check(name+' mixed sum has clear vertical fraction label',math.labels.at(-1)==='2 và 1 phần 4',math.labels);
   check(name+' '+mode+' keeps battlefield and fire visible',math.battle.y>=0&&math.battle.bottom<=h&&math.battle.height>=150&&math.fire.bottom<=h&&math.fire.height>=44,math);
   check(name+' '+mode+' touch targets stay at least 44x44',math.crystals.every(r=>r.width>=44&&r.height>=44),math.crystals);
   if(w<=412)check(name+' '+mode+' all crystal values remain visible',math.crystals.every(r=>r.y>=0&&r.bottom<=math.fire.y),math);
   check(name+' '+mode+' has no horizontal overflow',math.documentWidth<=w,math);
   await b.screenshot(folder+'/'+name+'-'+mode+'-math.png');
   if(mode==='hard'&&phase==='after'){
    await b.click(q('energy-crystal-b'));await b.click(q('energy-crystal-d'));await b.click(q('energy-crystal-f'));
    await b.evaluate('(()=>{const c=window.energyQA.engine;c.publish({problem:{...c.getSnapshot().problem,targetDisplay:"1 7/8 (1,875)",targetFraction:{num:15,den:8},targetNumeric:1.875}});})()');
    const triple=await b.evaluate(`(()=>{const rect=${rectFunction};return{expression:rect('[data-testid=energy-expression]'),labels:Array.from(document.querySelectorAll('[data-testid=energy-expression] [aria-label]')).map(e=>e.getAttribute('aria-label')),fire:rect('[data-testid=energy-fire]'),crystals:Array.from(document.querySelectorAll('[data-testid^=energy-crystal-]')).map(e=>rect('[data-testid="'+e.dataset.testid+'"]'))};})()`);
    check(name+' three operands keep a clear mixed sum',triple.labels.at(-1)==='1 và 7 phần 8',triple);
    if(w<=412)check(name+' three operands and all crystal values fit together',triple.expression.y>=0&&triple.expression.bottom<triple.fire.y&&triple.crystals.every(r=>r.bottom<=triple.fire.y),triple);
    await b.screenshot(folder+'/'+name+'-hard-three-operands.png');
   }
   const score=await b.evaluate('window.energyQA.engine.getSnapshot().score');await b.click(q('energy-fire'));
   check(name+' '+mode+' correct answer still fires for 25 points',await b.evaluate('window.energyQA.engine.getSnapshot().score')===score+25);
  }
  await open();await start('hard');
  await b.evaluate('('+function(){const q=window.energyQA,c=q.engine;
   const solve=p=>{for(let mask=1;mask<1<<p.availablePieces.length;mask++){let n=0,d=1;const ids=[];p.availablePieces.forEach((p,i)=>{if(mask&1<<i){n=n*p.fraction.den+p.fraction.num*d;d*=p.fraction.den;ids.push(p.id);}});if(n*p.targetFraction.den===p.targetFraction.num*d)return ids;}throw Error('No solution');};
   let i=0;while(c.getSnapshot().status==='running'&&i++<10000){const s=c.getSnapshot();if(s.enemies.length&&!s.shot){for(const id of solve(s.problem))c.toggle(id);c.fire();}c.advanceTo(c.now+100);}q.clock.set(c.now);if(c.getSnapshot().status!=='offer')throw Error('Challenge did not reach offer');
  }.toString()+')()');
  await wait('!!document.querySelector('+JSON.stringify(q('energy-endless-yes'))+')');
  const offer=await modalCheck(name+'-offer',w,h);
  for(const id of['energy-endless-yes','energy-endless-no']){const r=await b.evaluate('('+rectFunction+')('+JSON.stringify(q(id))+')');check(name+' '+id+' is accessible',r.y>=0&&r.bottom<=h&&r.height>=44,r);}
  if(name==='mobile-360'){
   await b.click(q('energy-endless-no'));
   check(name+' No ends Challenge without entering Endless',await b.evaluate('(()=>{const s=window.energyQA.engine.getSnapshot();return !s.endless&&s.status==="won";})()'));
  }else{
   await b.click(q('energy-endless-yes'));
   check(name+' Yes keeps original Endless entry rules',await b.evaluate('(()=>{const s=window.energyQA.engine.getSnapshot();return s.endless&&s.status==="running"&&s.endlessScore===0&&s.waveTotal===10;})()'));
  }
  report.viewports.push({name,width:w,height:h,history,offer});
  console.log('Checked '+name);
 }
 if(phase==='after'){
  await b.send('Emulation.setDeviceMetricsOverride',{width:320,height:640,mobile:true,deviceScaleFactor:1});
  await open();await b.evaluate('localStorage.setItem('+JSON.stringify(historyKey)+',"[]")');await b.click(q('energy-history-open'));
  await wait('!!document.querySelector('+JSON.stringify(q('energy-dialog'))+')');
  check('Empty history has its explanatory message and no fabricated record',await b.evaluate('document.querySelector("[data-testid=energy-dialog]").innerText.includes("Chưa có lượt Vô Tận")&&document.querySelectorAll("[data-testid=energy-history-record]").length===0'));
  await b.screenshot(folder+'/mobile-320-empty-history.png');
 }
 report.exceptions.push(...b.exceptions);check('No uncaught exceptions',report.exceptions.length===0,report.exceptions);check('No console errors',report.consoleErrors.length===0,report.consoleErrors);
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(folder+'/failure.png').catch(()=>{});throw error;}
finally{
 await writeFile(folder+'/report.json',JSON.stringify(report,null,2));
 if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 console.log(JSON.stringify({phase,checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,viewports:report.viewports.length,evidence:folder}));
}
