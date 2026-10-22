import assert from 'node:assert/strict';
import {Buffer} from 'node:buffer';
import {writeFile} from 'node:fs/promises';
import {flow,out} from './flow.mjs';
import {sleep} from './browser.mjs';
import {staticWeb} from './static.mjs';
const server=await staticWeb();process.env.ISLAND_URL=server.url+'/games/block-island';
const f=await flow(),{b,load,tap,cell,state,wait,select}=f,frames=[],actions=[];
const action=async(name,fn)=>{actions.push({name,at:Date.now()});await fn();await sleep(120);};
try{
 await load();b.onEvent('Page.screencastFrame',async e=>{frames.push({data:e.data,t:e.metadata.timestamp});await b.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
 await b.send('Page.startScreencast',{format:'jpeg',quality:78,maxWidth:390,maxHeight:844,everyNthFrame:2});await sleep(300);
 await action('Start continuous-island journey',()=>f.start());await tap('island-coach-skip');
 await b.evaluate(`window.motion=[];window.watchMotion=true;requestAnimationFrame(function sample(t){if(!window.watchMotion)return;const e=document.querySelector('[data-testid="island-build-motion"]'),scene=document.querySelector('[data-testid="island-scene"]'),seal=document.querySelector('[data-testid="island-seal-effect"]');window.motion.push({t,opacity:e?Number(getComputedStyle(e).opacity):null,transform:e?getComputedStyle(e).transform:null,scene:scene?getComputedStyle(scene).transform:null,seal:seal?Number(getComputedStyle(seal).opacity):null});requestAnimationFrame(sample);});`);
 const points=(await state()).quests[0].witness;
 await action('Choose brick material',()=>select('brick'));await action('Place brick floor: area +1',()=>cell(points[0],120));
 await action('Choose stone material',()=>select('stone'));await action('Place stone floor: area +1',()=>cell(points[1],120));
 await action('Choose tree material',()=>select('oak'));await action('Plant tree on existing floor: area unchanged',()=>cell(points[0],120));assert.equal((await state()).blocks.filter(b=>b.blockType==='floor').length,2);
 const old=(await state()).blocks;await action('Show real translucent blueprint',()=>tap('island-hint'));assert.deepEqual((await state()).blocks,old);assert((await state()).hint);await sleep(500);
 await action('Rotate island and blueprint right',()=>tap('island-rotate-right'));await f.settle();await action('Rotate left to original view',()=>tap('island-rotate-left'));await f.settle();await action('Hide hint; world unchanged',()=>tap('island-hint'));assert.deepEqual((await state()).blocks,old);
 await select('grass');for(const p of points.slice(2))await action('Place garden floor '+p.x+','+p.y,()=>cell(p,60));await action('Plant a shrub without adding area',async()=>{await select('bush');await cell(points[6],80);});
 await action('Validate area 16 and seal new blocks',()=>tap('island-check'));assert.equal((await state()).correct,1);await sleep(450);await action('Continue on the same construction: mission 2',()=>f.next());assert.equal((await state()).blocks.filter(b=>b.blockType==='floor').length,16);
 await action('Try removing sealed old block',async()=>{await tap('island-tool-remove');await cell(points[0],100);});assert((await state()).feedback.text.includes('\u0111\u00e3 ni\u00eam phong'));
 await action('Show state-aware extension blueprint for P20',()=>tap('island-hint'));const target=(await state()).hint.target;await sleep(400);await action('Hide extension blueprint',()=>tap('island-hint'));await select('paving');for(const p of target){if((await state()).blocks.some(b=>b.blockType==='floor'&&b.x===p.x&&b.y===p.y&&b.floorIndex===p.floorIndex))continue;await action('Add new paving floor next to sealed garden',()=>cell(p,100));}await action('Complete perimeter 20 task',()=>tap('island-check'));assert.equal((await state()).correct,2);await sleep(350);
 await tap('island-pause');await tap('island-home');await action('Start multi-floor challenge',()=>f.start('hard'));await tap('island-coach-skip');const building=(await state()).quests[0].witness;
 await select('brick');for(const p of building.filter(p=>p.floorIndex===0))await action('Build brick ground slab',()=>cell(p,70));await action('Place a brick wall: no extra floor area',async()=>{await select('brick-wall');await cell(building[0],70);});
 await f.floor(1);await action('Show blueprint on upper floor',()=>tap('island-hint'));await sleep(300);await tap('island-hint');await select('wood');for(const p of building.filter(p=>p.floorIndex===1))await action('Build supported wooden second floor',()=>cell(p,70));
 await action('Observe land area 4 vs total floors 8',()=>tap('island-floor-details'));await sleep(400);await tap('island-floor-details-back');await action('Seal two-floor building',()=>tap('island-check'));assert.equal((await state()).correct,1);await sleep(450);
 await b.evaluate('window.watchMotion=false');const samples=await b.evaluate('window.motion'),moving=samples.filter(s=>s.opacity>0&&s.opacity<1),transforms=new Set(moving.map(s=>s.transform)),sealFrames=samples.filter(s=>s.seal>0&&s.seal<1);assert(transforms.size>1);assert(sealFrames.length>0);
 await b.send('Page.stopScreencast');await sleep(150);const start=frames[0].t,timeline=frames.map(p=>({data:p.data,ms:(p.t-start)*1000})),duration=timeline.at(-1).ms;assert(frames.length>100);
 await writeFile(`${out}/web-motion.json`,JSON.stringify({platform:'Chrome responsive production web',placementDurationMs:220,cameraPanZoomDurationMs:220,quarterTurnRotation:true,sealEffectDurationMs:600,intermediatePlacementFrames:moving.length,distinctIntermediateTransforms:transforms.size,intermediateSealFrames:sealFrames.length,sampledFrames:samples.length,sourceFrames:frames.length,exceptions:b.exceptions},null,2));
 // Encode the actual DevTools screencast at its original timestamps, 1× speed.
 // No scene is reconstructed and no gameplay frame is replaced by a mockup.
 await b.send('Page.navigate',{url:'data:text/html,<canvas id="movie" width="390" height="844"></canvas>'});
 await b.evaluate(`window.frames=${JSON.stringify(timeline)};window.movie=null;window.encodeError=null;void(async()=>{try{
 const canvas=document.getElementById('movie'),ctx=canvas.getContext('2d');const images=await Promise.all(window.frames.map(f=>new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=bad;i.src='data:image/jpeg;base64,'+f.data;})));
 ctx.drawImage(images[0],0,0,390,844);const stream=canvas.captureStream(30),type='video/webm;codecs=vp8',recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:2200000}),parts=[];recorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data);};const done=new Promise(ok=>recorder.onstop=ok);recorder.start();const started=performance.now();let index=0;
 await new Promise(ok=>{function draw(){const elapsed=performance.now()-started;while(index+1<window.frames.length&&window.frames[index+1].ms<=elapsed)index++;ctx.drawImage(images[index],0,0,390,844);if(elapsed<${duration+200})requestAnimationFrame(draw);else ok();}draw();});recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());const bytes=new Uint8Array(await new Blob(parts,{type}).arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));window.movie={data:btoa(str),elapsedMs:performance.now()-started};
 }catch(e){window.encodeError=String(e.stack||e);}})();`);
 await wait(()=>b.evaluate('window.movie!==null||window.encodeError!==null'),'video encoded');const movie=await b.evaluate('window.movie');assert(movie,await b.evaluate('window.encodeError'));
 await writeFile(`${out}/island-gameplay-1x.webm`,Buffer.from(movie.data,'base64'));
 await writeFile(`${out}/video-metadata.json`,JSON.stringify({source:'Actual Chrome DevTools screencast, original timestamps',speed:1,platform:'responsive web',width:390,height:844,frames:frames.length,sourceDurationMs:duration,encodedDurationMs:movie.elapsedMs,audio:false,actions},null,2));
 assert.deepEqual(b.exceptions,[]);console.log({frames:frames.length,sourceDurationMs:duration,encodedDurationMs:movie.elapsedMs,intermediateTransforms:transforms.size});
}finally{await b.close();await server.close();}
