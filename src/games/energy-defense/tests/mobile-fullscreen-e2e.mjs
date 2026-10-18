import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { browserSession, sleep } from '../../../../scripts/lib/cdp.mjs';
const phase=process.argv[2]||'after',out='artifacts/energy-defense-mobile-fullscreen',folder=out+'/'+phase;
const root=path.resolve(out+'/'+(phase==='before'?'before-web':'web-dist'));
await mkdir(folder,{recursive:true});
const report={phase,platform:'Chrome production web; CSS pixels approximate dp at DPR=1. Not native Android.',checks:[],viewports:[],consoleErrors:[],motion:[]};
const q=id=>'[data-testid="'+id+'"]';
function check(name,passed,detail){report.checks.push({name,passed:!!passed,detail});if(phase==='after')assert.ok(passed,name+' '+JSON.stringify(detail));}
const server=http.createServer(async(req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}let data;try{data=await readFile(file);}catch{file=path.join(root,'index.html');data=await readFile(file);}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(500);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let b;
const locate='('+function(){let f=document.querySelector('[data-testid=energy-mode-selection]');f=f?.[Object.keys(f).find(k=>k.startsWith('__reactFiber$'))];while(f){for(const candidate of[f,f.alternate]){let h=candidate?.memoizedState,engine,clock;for(let i=0;h&&i<120;i++,h=h.next){const v=h.memoizedState;if(v&&typeof v.getSnapshot==='function'&&typeof v.advanceTo==='function')engine=v;if(!clock&&v&&typeof v.get==='function'&&typeof v.set==='function'&&typeof v.get()==='number')clock=v;}if(engine){window.energyQA={engine,clock};return true;}}f=f.return;}return false;}.toString()+')()';
async function wait(e){let start=Date.now();while(Date.now()-start<20000){if(await b.evaluate(e))return;await sleep(30);}throw Error('Timeout '+e);}
async function open(mode='hard'){await b.send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/games/energy-defense`});await wait('!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');assert.ok(await b.evaluate(locate));await b.click(q('energy-mode-'+mode));await b.click(q('energy-start'));await wait('!!document.querySelector('+JSON.stringify(q('energy-combat-viewport'))+')');await wait('Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)');await sleep(120);}
const fixture='('+function(){const c=window.energyQA.engine;const pieces=[['a','1 1/2 (1,50)',3,2],['b','3/4',3,4],['c','1/2',1,2],['d','1/4',1,4],['e','1,00',1,1],['f','1/8',1,8]];c.publish({problem:{...c.getSnapshot().problem,targetDisplay:'2 1/4 (2,25)',targetFraction:{num:9,den:4},targetNumeric:2.25,availablePieces:pieces.map(([id,display,num,den])=>({id,display,fraction:{num,den},numericVal:num/den}))},selected:[],feedback:null,enemies:['scout','slime','golem'].map((type,i)=>({id:701+i,type,speed:[1.3,1,.7][i],hp:[25,40,60][i],maxHp:[25,40,60][i],bornAt:c.now-[95,205,290][i]/[1.3,1,.7][i]*100,x:0,y:70})),spawned:c.getSnapshot().waveTotal,processed:0});window.energyQA.clock.set(c.now);}.toString()+')()';
const metrics='('+function(){const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,cx:r.x+r.width/2,cy:r.y+r.height/2};};const get=id=>{const e=document.querySelector('[data-testid="'+id+'"]');return e?rect(e):null;};const world=document.querySelector('[data-testid=energy-portrait-world]');const vp=get('energy-combat-viewport');return{battle:vp,console:get('energy-console'),hud:get('energy-mobile-hud'),fire:get('energy-fire'),expression:get('energy-expression'),world:world?rect(world):null,base:get('energy-citadel'),turret:get('energy-turret-base'),creeps:Array.from(document.querySelectorAll('[data-testid^=energy-creep-]')).filter(e=>/^energy-creep-\d+$/.test(e.dataset.testid)).map(rect),crystals:Array.from(document.querySelectorAll('[data-testid^=energy-crystal-]')).map(rect),labels:Array.from(document.querySelectorAll('[data-testid=energy-expression] [aria-label]')).map(e=>e.getAttribute('aria-label')),documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,clock:window.energyQA.clock.get(),timer:document.querySelector('[data-testid=energy-timer]').innerText};}.toString()+')()';
async function select(){await b.click(q('energy-crystal-a'));await b.click(q('energy-crystal-b'));}
async function modal(name,w,h){await wait('!!document.querySelector('+JSON.stringify(q('energy-dialog-card'))+')');const r=await b.evaluate(`(()=>{const e=document.querySelector('[data-testid=energy-dialog-card]'),r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,opacity:getComputedStyle(e).opacity};})()`);check(name+' modal fits',r.x>=0&&r.y>=0&&r.right<=w+.1&&r.bottom<=h+.1&&r.opacity==='1',r);await b.screenshot(folder+'/'+name+'.png');}
const solve='p=>{for(let mask=1;mask<1<<p.availablePieces.length;mask++){let n=0,d=1,ids=[];p.availablePieces.forEach((p,i)=>{if(mask&1<<i){n=n*p.fraction.den+p.fraction.num*d;d*=p.fraction.den;ids.push(p.id);}});if(n*p.targetFraction.den===p.targetFraction.num*d)return ids;}throw Error("No solution");}';
try{
 b=await browserSession(390,844);b.onEvent('Runtime.consoleAPICalled',e=>{if(e.type==='error')report.consoleErrors.push(e.args.map(a=>a.description||a.value).join(' '));});
 const cases=[['320x640',320,640],['360x640',360,640],['360x800',360,800],['390x844',390,844],['412x915',412,915],['notch-390x844',390,844],['tablet',768,1024],['desktop',1440,1000],['landscape',844,390]];
 for(const[name,w,h]of cases){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:w<1000,deviceScaleFactor:1});
  const notch=name.startsWith('notch');
  await b.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:notch?47:0,bottom:notch?34:0,left:0,right:0}});
  await open();await b.evaluate(fixture);await select();await sleep(100);
  const timing=await b.evaluate(`new Promise(resolve=>{const deltas=[],start=performance.now();let last=start;function tick(t){deltas.push(t-last);last=t;if(t-start<1500)requestAnimationFrame(tick);else{const sorted=deltas.slice(1).sort((a,b)=>a-b);resolve({samples:sorted.length,median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],over50ms:sorted.filter(d=>d>50).length});}}requestAnimationFrame(tick);})`);
  const m=await b.evaluate(metrics);m.frameTiming=timing;m.name=name;m.width=w;m.height=h;m.battleHeightPercent=m.battle.height/h*100;m.battleAreaPercent=m.battle.width*m.battle.height/(w*h)*100;m.mathHeightPercent=m.console.height/h*100;
  if(m.world){m.cameraScale=m.world.width/440;m.usefulArea=440*662*m.cameraScale*m.cameraScale;m.usefulAreaPercent=m.usefulArea/(w*h)*100;}else{m.cameraScale=m.battle.width/700;m.usefulArea=m.battle.width*m.battle.height;m.usefulAreaPercent=m.battleAreaPercent;}
  report.viewports.push(m);await b.screenshot(folder+'/'+name+'-selected.png');
  check(name+' viewport has no horizontal overflow',m.documentWidth<=w,m.documentWidth);
  if(w<600){
   check(name+' no vertical page scroll',m.documentHeight<=h,m.documentHeight);
   check(name+' six crystals have 48dp targets',m.crystals.length===6&&m.crystals.every(r=>r.width>=48&&r.height>=48),m.crystals);
   check(name+' battlefield and fire visible',m.battle.y>=0&&m.battle.bottom<=m.console.y+.1&&m.fire.bottom<=h-(notch?34:0)+.1&&m.fire.height>=48,m);
   if(phase==='after'){
    check(name+' battlefield occupies over 60 percent',m.battleHeightPercent>60,m.battleHeightPercent);
    check(name+' HUD respects notch',m.hud.y>=0&&m.hud.height>=(notch?47:0)+90,m.hud);
    check(name+' enemies and structures clear HUD/dock',m.creeps.every(r=>r.y>=m.hud.bottom&&r.bottom<=m.console.y)&&[m.base,m.turret].every(r=>r.y>=m.hud.bottom&&r.bottom<=m.console.y),m);
    check(name+' mixed addition remains exact',m.labels.at(-1)==='2 và 1 phần 4',m.labels);
   }
  }
  if(phase==='after'){
   await b.click('[aria-label="Tạm dừng"]');await modal(name+'-pause',w,h);const paused=await b.evaluate(metrics);await sleep(180);const still=await b.evaluate(metrics);check(name+' pause freezes clock',paused.clock===still.clock);
   await b.click(q('energy-resume'));await sleep(80);check(name+' resume advances',await b.evaluate('window.energyQA.clock.get()')>still.clock);
   // Actual shot motion: sample rendered pixels across the charge/projectile/impact/death.
   const trace=b.evaluate(`new Promise(resolve=>{const rows=[],start=performance.now();function tick(t){const r=id=>{const e=document.querySelector('[data-testid="'+id+'"]');if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2,opacity:+getComputedStyle(e).opacity};};const c=window.energyQA.engine.getSnapshot(),target=c.shot?.targetId;rows.push({ms:t-start,clock:window.energyQA.clock.get(),shot:c.shot,body:target?r('energy-creep-'+target):null,impact:r('energy-impact'),projectile:r('energy-projectile'),pose:target?r('energy-creep-pose-'+target):null,frame:target?getComputedStyle(document.querySelector('[data-testid="energy-sprite-frame-'+target+'"]')).transform:null});if(t-start<1000)requestAnimationFrame(tick);else resolve(rows);}requestAnimationFrame(tick);})`);
   await b.click(q('energy-fire'));if(w===390&&!notch){await sleep(110);await b.screenshot(folder+'/'+name+'-firing.png');}const rows=await trace;
   const hits=rows.filter(r=>r.impact?.opacity>.1&&r.body),flights=rows.filter(r=>r.projectile?.opacity>.1);
   check(name+' projectile and impact actually render',hits.length>0&&flights.length>0,{hits:hits.length,flights:flights.length});
   const errors=hits.map(r=>Math.hypot(r.impact.cx-r.body.cx,r.impact.cy-(r.body.y+r.body.height*(228/256-.36))));
   check(name+' impact hits target within 4dp',Math.max(...errors)<4,errors);
   if(w===390&&!notch)await writeFile(out+'/shot-motion.json',JSON.stringify(rows));
   report.motion.push({name,impactErrorDp:Math.max(...errors),projectileSamples:flights.length});
  }
  console.log(phase+' '+name+' battlefield '+m.battle.height.toFixed(1)+'dp '+m.battleHeightPercent.toFixed(1)+'%');
 }
 if(phase==='after'){
  await b.send('Emulation.setDeviceMetricsOverride',{width:360,height:640,mobile:true,deviceScaleFactor:1});await open('hard');
  await b.evaluate(`(()=>{const c=window.energyQA.engine,solve=${solve};let i=0;while(c.getSnapshot().status==='running'&&i++<10000){const s=c.getSnapshot();if(s.enemies.length&&!s.shot){for(const id of solve(s.problem))c.toggle(id);c.fire();}c.advanceTo(c.now+100);}window.energyQA.clock.set(c.now);if(c.getSnapshot().status!=='offer')throw Error('No Endless offer');})()`);
  await modal('endless-offer',360,640);await b.click(q('energy-endless-yes'));check('Endless entry preserved',await b.evaluate('window.energyQA.engine.getSnapshot().endless'));
  await b.evaluate(`(()=>{const c=window.energyQA.engine,solve=${solve};for(const id of solve(c.getSnapshot().problem))c.toggle(id);c.fire();c.advanceTo(c.now+800);window.energyQA.clock.set(c.now);})()`);
  check('Endless kill awards 10 points',await b.evaluate('window.energyQA.engine.getSnapshot().endlessScore')===10);
  await b.click('[aria-label="Tạm dừng"]');await b.click('[aria-label="CHỌN LẠI CHẾ ĐỘ"]');await wait('!!document.querySelector('+JSON.stringify(q('energy-mode-selection'))+')');await b.click(q('energy-history-open'));await modal('endless-history',360,640);check('Endless history saved',await b.evaluate('document.querySelectorAll("[data-testid=energy-history-record]").length')>=1);await b.click(q('energy-history-close'));
  for(const mode of ['easy','medium']) {
   await open(mode);
   const ids=await b.evaluate('('+solve+')(window.energyQA.engine.getSnapshot().problem)');
   for(const id of ids)await b.click(q('energy-crystal-'+id));
   const s=await b.evaluate(metrics);check(mode+' math and touch UI visible',s.fire.bottom<=640&&s.crystals.every(r=>r.height>=48),s);
   await b.screenshot(folder+'/'+mode+'-selected.png');await b.click(q('energy-fire'));check(mode+' correct answer accepted',await b.evaluate('window.energyQA.engine.getSnapshot().correct')===1);
  }
  for(const reason of['timeout','defeat','victory']){await open('easy');await b.evaluate('window.energyQA.engine.finish('+JSON.stringify(reason)+')');await modal(reason,360,640);}
  // Uninterrupted normal-speed recording; no fixtures or advanceTo calls in this run.
  await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await open('hard');
  const events=[],writes=[];await mkdir(out+'/video-frames',{recursive:true});
  const off=b.onEvent('Page.screencastFrame',e=>{const file=String(events.length).padStart(5,'0')+'.jpg';events.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(out+'/video-frames/'+file,Buffer.from(e.data,'base64')));return b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
  await b.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:390,maxHeight:844,everyNthFrame:1});
  const stamp=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get()})'),wall=Date.now();let next=0;
  while(Date.now()-wall<24000){await sleep(300);if(Date.now()-wall>next){console.log('1x recording '+Math.floor((Date.now()-wall)/1000)+'s');next+=5000;}
   const s=await b.evaluate('window.energyQA.engine.getSnapshot()');if(s.enemies.length&&Date.now()-wall>10000&&!s.shot){const ids=await b.evaluate('('+solve+')(window.energyQA.engine.getSnapshot().problem)');for(const id of ids)await b.click(q('energy-crystal-'+id));await b.click(q('energy-fire'));}
  }
  const endStamp=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get()})'),delta=endStamp.clock-stamp.clock,wallMs=endStamp.wall-stamp.wall;check('Recording uses real-time 1x clock',Math.abs(delta-wallMs)<100,{simulation:delta,wall:wallMs});
  await b.send('Page.stopScreencast');off();await Promise.all(writes);await writeFile(out+'/video-frames/timestamps.json',JSON.stringify(events));report.recording={frames:events.length,seconds:events.at(-1).timestamp-events[0].timestamp,speed:'1x real gameplay, actual touch input, no fixtures or clock jumps',audio:false};
 }
 check('No runtime exceptions',b.exceptions.length===0,b.exceptions);check('No console errors',report.consoleErrors.length===0,report.consoleErrors);
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(folder+'/failure.png').catch(()=>{});throw error;}
finally{await writeFile(folder+'/report.json',JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({phase,checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,error:report.error}));}
