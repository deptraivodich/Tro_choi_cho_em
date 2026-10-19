import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-round36b',root=path.resolve(out+'/web-dist');
const report={platform:'Chrome production web; not native Android',checks:[],viewports:[],liveSpawns:[],errors:[]};
const q=id=>'[data-testid="'+id+'"]';
let b;
const desktopOnly=process.argv.includes('--desktop-only');
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

async function seed(distance,type='golem') {
 await b.evaluate('window.energyQA.engine.pause()');await sleep(100);
 await b.evaluate('('+function(d,type){const c=window.energyQA.engine,s=c.getSnapshot(),speed=type==='golem'?.7:type==='slime'?1:1.3;
  c.publish({paused:true,enemies:[{id:901,type,speed,hp:60,maxHp:60,bornAt:c.now-d/speed*100,x:0,y:70}],spawned:s.waveTotal,processed:0,shot:null});
  window.energyQA.clock.set(c.now);
 }.toString()+')('+distance+','+JSON.stringify(type)+')');await sleep(100);
 await b.evaluate("document.querySelector('[data-testid=energy-dialog]').style.visibility='hidden'");
}
const inspect='('+function(){
 const get=id=>document.querySelector('[data-testid='+id+']'),rect=id=>{const e=get(id);if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
 const c=rect('energy-creep-901'),shadow=rect('energy-creep-shadow-901'),base=rect('energy-turret-base'),axle=rect('energy-turret-axle'),muzzle=rect('energy-muzzle-anchor'),castle=rect('energy-citadel');
 const center=r=>({x:r.x+r.width/2,y:r.y+r.height/2}),hinge=center(axle),mouth=center(muzzle),bearing={x:base.x+base.width*225/512,y:base.y+base.height*160/512};
 const pose=new DOMMatrix(getComputedStyle(get('energy-creep-pose-901')).transform);
 const foot={x:c.x+c.width/2,y:c.y+c.height*228/256},body={x:foot.x,y:foot.y-c.height*.36};
 const road=get('energy-road-centerline'),p=road.getPointAtLength(road.getTotalLength()),mat=road.getScreenCTM(),end={x:mat.a*p.x+mat.c*p.y+mat.e,y:mat.b*p.x+mat.d*p.y+mat.f};
 const mobile=!!get('energy-portrait-world'),contact={x:castle.x+castle.width*207/512,y:castle.y+castle.height*(mobile?335:383)/512};
 return {base,castle,hinge,mouth,bearing,body,foot,shadow:center(shadow),pose:{a:pose.a,b:pose.b,c:pose.c,d:pose.d},end,contact,
  shield:!!get('energy-citadel-shield'),hud:rect('energy-mobile-hud'),dock:rect('energy-console'),width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight};
}.toString()+')()';
async function crop(name,r,pad=20){const shot=await b.send('Page.captureScreenshot',{format:'png',clip:{x:Math.max(0,r.x-pad),y:Math.max(0,r.y-pad),width:r.width+2*pad,height:r.height+2*pad,scale:3}});await writeFile(out+'/images/'+name+'.png',Buffer.from(shot.data,'base64'));}

try {
 b=await browserSession(390,844);
 for(const [w,h] of [[320,640],[360,640],[390,844],[412,915],[768,1024],[1440,1000]].filter(([w])=>!desktopOnly||w>=600)){
  await b.send('Emulation.setDeviceMetricsOverride',{width:w,height:h,mobile:w<600,deviceScaleFactor:1});await open();
  const rows=[];
  for(const d of (w<600?[0,30,80,160,200,260,320,380,440,500,580]:[25,190,330])) {
   await seed(d);const r=await b.evaluate(inspect);rows.push({d,...r});
   check(w+' axle fixed on bearing at '+d,Math.hypot(r.hinge.x-r.bearing.x,r.hinge.y-r.bearing.y)<.2,r);
   const mx=r.mouth.x-r.hinge.x,my=r.mouth.y-r.hinge.y,tx=r.body.x-r.hinge.x,ty=r.body.y-r.hinge.y;
   check(w+' mouth aims at target at '+d,Math.abs(mx*ty-my*tx)/Math.hypot(mx,my)/Math.hypot(tx,ty)<.015,{mx,my,tx,ty});
   check(w+' body stays upright at '+d,Math.abs(r.pose.b)<.001&&Math.abs(r.pose.c)<.001&&r.pose.d===1,r.pose);
   if(w<600&&[260,320,380,440].includes(d))check(w+' middle/down facing left '+d,r.pose.a===-1,r.pose);
   if(d===80||d===500||w>=600)check(w+' right facing '+d,r.pose.a===1,r.pose);
   check(w+' foot/shadow agree at '+d,Math.abs(r.foot.x-r.shadow.x)<.05&&Math.abs(r.foot.y-r.shadow.y)<1,r);
  }
  const r=rows.at(-1);
  check(w+' endpoint contacts real door face',Math.hypot(r.end.x-r.contact.x,r.end.y-r.contact.y)<.05,r);
  check(w+' shield scoped to desktop',r.shield===(w>=600),r.shield);
  check(w+' no horizontal overflow',r.width<=w,r.width);
  if(w<600)check(w+' castle clears HUD and dock',r.castle.y>r.hud.bottom&&r.castle.bottom<r.dock.y,r);
  await seed(w<600?300:200,'slime');if(w>=600){await open();await sleep(2400);check(w+' live battlefield visible',await b.evaluate("getComputedStyle(document.querySelector('[data-testid=energy-battlefield]').parentElement).opacity==='1'"));}await b.screenshot(out+'/images/'+w+'x'+h+'.png');
  if(w===390){const r=await b.evaluate(inspect);await crop('castle-lowered-no-ring',r.castle,28);await crop('turret-pivot',r.base,40);await crop('middle-segment-facing-left',{x:r.foot.x-45,y:r.foot.y-55,width:90,height:80},25);}
  report.viewports.push({w,h,rows});
 }
 if(!desktopOnly){
 // Continuous full route at original speed: first scout reaches castle; fire only afterwards.
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,deviceScaleFactor:1});await open();
 await b.evaluate("(()=>{const c=window.energyQA.engine;let i=0;c.random=()=>[0,.4,.9][i++%3];window.motion=[];window.arrivals=[];window.spawns=[];let last=0,hp=100;const seen=new Set();c.subscribe(()=>{const s=c.getSnapshot();for(const e of s.enemies)if(!seen.has(e.id)){seen.add(e.id);window.spawns.push({id:e.id,type:e.type,bornAt:e.bornAt});}if(s.hp!==hp){hp=s.hp;window.arrivals.push({clock:c.now,hp,ids:s.enemies.map(e=>e.id)});}});function sample(){if(c.now-last>70){last=c.now;const e=document.querySelector('[data-testid=energy-creep-1]'),p=document.querySelector('[data-testid=energy-creep-pose-1]');if(e&&p){const r=e.getBoundingClientRect(),m=new DOMMatrix(getComputedStyle(p).transform);window.motion.push({clock:c.now,x:r.x+r.width/2,y:r.y+r.height*228/256,facing:m.a,b:m.b,c:m.c});}}if(c.now<55000)requestAnimationFrame(sample);}requestAnimationFrame(sample);})()");
 await mkdir(out+'/video-frames',{recursive:true});const events=[],writes=[];const off=b.onEvent('Page.screencastFrame',e=>{const file=String(events.length).padStart(5,'0')+'.jpg';events.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(out+'/video-frames/'+file,Buffer.from(e.data,'base64')));return b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
 await b.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:390,maxHeight:844,everyNthFrame:3});
 const start=await b.evaluate('({wall:performance.now(),clock:window.energyQA.clock.get()})');let fired=false,next=0,saved=false;
 while(await b.evaluate('window.energyQA.clock.get()')<51500){await sleep(130);const t=await b.evaluate('window.energyQA.clock.get()');
  if(t>next){console.log('1x recording '+Math.floor(t/1000)+'s');next+=10000;}
  if(t>24000&&!saved){await b.screenshot(out+'/images/mobile-overview-live.png');saved=true;}
  if(t>48000&&!fired){await b.evaluate('('+function(){const c=window.energyQA.engine,s=c.getSnapshot();c.publish({problem:{...s.problem,targetFraction:{num:1,den:1},targetDisplay:'1',targetNumeric:1,availablePieces:[{id:'qa-one',display:'1',fraction:{num:1,den:1},numericVal:1}]},selected:[]});}.toString()+')()');await b.click(q('energy-crystal-qa-one'));await b.click(q('energy-fire'));fired=true;}
 }
 await b.send('Page.stopScreencast');off();await Promise.all(writes);await writeFile(out+'/video-frames/timestamps.json',JSON.stringify(events));
 report.live=await b.evaluate('({motion:window.motion,spawns:window.spawns,arrivals:window.arrivals,wall:performance.now(),clock:window.energyQA.clock.get(),state:window.energyQA.engine.getSnapshot()})');
 const m=report.live.motion,flips=m.slice(1).filter((r,i)=>r.facing!==m[i].facing);
 check('live full route exactly two facing changes',flips.length===2,flips);
 check('live route upright at every sampled frame',m.every(r=>Math.abs(r.b)<.001&&Math.abs(r.c)<.001));
 for(const facing of [1,-1])check('live horizontal motion agrees with facing '+facing,m.slice(1).filter((r,i)=>Math.abs(r.x-m[i].x)>Math.abs(r.y-m[i].y)&&r.facing===facing&&m[i].facing===facing).every((r)=>{const i=m.indexOf(r);return Math.sign(r.x-m[i-1].x)===facing;}));
 check('first scout reaches castle once',report.live.arrivals.length===1&&report.live.arrivals[0].hp===85&&!report.live.arrivals[0].ids.includes(1),report.live.arrivals);
 check('spawn schedule preserved',report.live.spawns.slice(0,5).map(e=>e.bornAt).join(',')==='2000,5500,9000,12500,16000',report.live.spawns);
 check('shot after arrival resolves once',report.live.state.kills===1&&report.live.state.score===25,report.live.state);
 check('1x game clock',Math.abs((report.live.wall-start.wall)-(report.live.clock-start.clock))<600,{start,end:report.live.clock,wall:report.live.wall});
 check('no runtime exceptions',b.exceptions.length===0,b.exceptions);
 report.video={seconds:events.at(-1).timestamp-events[0].timestamp,frames:events.length,audio:false,platform:'Production Chrome web',speed:'1x original game clock; seeded types; one answer fixture at 48s; no position/time jumps'};
}
}catch(error){report.error=String(error.stack);if(b)await b.screenshot(out+'/images/failure.png').catch(()=>{});throw error;}
finally{await writeFile(out+(desktopOnly?'/web-desktop-regression.json':'/web-report.json'),JSON.stringify(report,null,2));if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,error:report.error}));}
