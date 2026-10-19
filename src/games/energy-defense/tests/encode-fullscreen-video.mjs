// Encode the captured wall-clock timeline with Chrome's installed MediaRecorder.
// No new dependency, frame interpolation, simulation changes or time compression.
import http from 'node:http';
import path from 'node:path';
import { readFile,writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const root=path.resolve('artifacts/energy-defense-mobile-fullscreen');
const events=JSON.parse(await readFile(path.join(root,'video-frames/timestamps.json'),'utf8'));
const chunks=[];
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/chunk'){
   const buffers=[];for await(const buffer of req)buffers.push(buffer);
   chunks.push({index:Number(url.searchParams.get('index')),data:Buffer.concat(buffers)});res.end('OK');return;
  }
  if(url.pathname==='/events'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(events));return;}
  if(/^\/[0-9]{5}\.jpg$/.test(url.pathname)){res.setHeader('Content-Type','image/jpeg');res.end(await readFile(path.join(root,'video-frames',url.pathname.slice(1))));return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Encode captured 1x timeline</title><canvas></canvas>');
 }catch{res.writeHead(500);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let b;
try{
 b=await browserSession(390,844);await b.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
 await b.evaluate('('+function(){
  window.encodingState={state:'loading'};
  (async()=>{
   const rows=await(await fetch('/events')).json(),times=rows.map(e=>e.timestamp),duration=(times.at(-1)-times[0])*1000;
   const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),cache=new Map();
   const prefetch=index=>{for(let i=index;i<Math.min(rows.length,index+8);i++)if(!cache.has(i))cache.set(i,fetch('/'+rows[i].file).then(r=>r.blob()).then(createImageBitmap));};
   prefetch(0);const first=await cache.get(0);canvas.width=first.width;canvas.height=first.height;ctx.drawImage(first,0,0);
   await Promise.all([...cache.values()]);
   const mime=['video/mp4;codecs=avc1.42001E','video/webm;codecs=vp8'].find(type=>MediaRecorder.isTypeSupported(type));
   if(!mime)throw Error('No installed Chrome encoder supports MP4/H264 or WebM/VP8');
   const recorder=new MediaRecorder(canvas.captureStream(30),{mimeType:mime,videoBitsPerSecond:8000000});
   let upload=Promise.resolve(),chunk=0,index=0,draws=0;
   recorder.ondataavailable=e=>{if(e.data.size){const i=chunk++;upload=upload.then(()=>fetch('/chunk?index='+i,{method:'POST',body:e.data})).then(r=>{if(!r.ok)throw Error('Chunk upload failed');});}};
   const done=new Promise(resolve=>{recorder.onstop=resolve;});
   const start=performance.now();recorder.start(1000);
   window.encodingState={state:'encoding',mime,seconds:0};
   while(performance.now()-start<duration){
    const at=times[0]+(performance.now()-start)/1000;
    while(index+1<rows.length&&times[index+1]<=at)index++;
    prefetch(index);const bitmap=await cache.get(index);ctx.drawImage(bitmap,0,0);draws++;
    for(const[key,value]of cache)if(key<index-2){value.then(bitmap=>bitmap.close());cache.delete(key);}
    window.encodingState.seconds=(performance.now()-start)/1000;
    await new Promise(requestAnimationFrame);
   }
   recorder.stop();await done;await upload;
   window.encodingState={state:'done',mime,width:canvas.width,height:canvas.height,draws,seconds:(performance.now()-start)/1000,sourceSeconds:duration/1000};
  })().catch(error=>window.encodingState={state:'error',error:String(error.stack)});
 }.toString()+')()');
 const start=Date.now();let status,nextLog=0;
 while(Date.now()-start<90000){
  status=await b.evaluate('window.encodingState');
  if(status.state==='error')throw Error(status.error);
  if(status.state==='done')break;
  if((status.seconds||0)>=nextLog){console.log(JSON.stringify(status));nextLog+=10;}
  await sleep(500);
 }
 if(status?.state!=='done')throw Error('Chrome encoding exceeded 90 seconds');
 const filename='gameplay-web-1x.'+(status.mime.startsWith('video/mp4')?'mp4':'webm');
 const data=Buffer.concat(chunks.sort((a,b)=>a.index-b.index).map(c=>c.data));
 if(data.length<10000)throw Error('Encoded video is empty');
 await writeFile(path.join(root,filename),data);
 const meta={...status,file:filename,bytes:data.length,capturedFrames:events.length,capturedSeconds:events.at(-1).timestamp-events[0].timestamp,platform:'Actual Chrome production Web, not native',speed:'1x: original capture timestamps held on a canvas; no interpolation or time compression',audio:false,note:'30fps captureStream is the encoder rate, not measured game/native FPS.'};
 await writeFile(path.join(root,'video-metadata.json'),JSON.stringify(meta,null,2));console.log(JSON.stringify(meta,null,2));
}finally{if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
