import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile,writeFile } from 'node:fs/promises';
import { browserSession,sleep } from '../../../../scripts/lib/cdp.mjs';
const out='artifacts/energy-defense-round36b';
const server=http.createServer(async(req,res)=>{
 try{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!/^(gameplay|portal-closeup)-web-1x\.mp4$/.test(name)){
   res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><video id="v" muted controls style="width:570px;height:510px" src="/gameplay-web-1x.mp4"></video>');return;
  }
  const data=await readFile(out+'/'+name),range=req.headers.range?.match(/bytes=(\d+)-(\d*)/);
  res.setHeader('Content-Type','video/mp4');res.setHeader('Accept-Ranges','bytes');
  if(range){const start=+range[1],end=range[2]?Math.min(+range[2],data.length-1):data.length-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(data.subarray(start,end+1));}
  else{res.setHeader('Content-Length',data.length);res.end(data);}
 }catch{res.writeHead(500);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let b;const rows=[];
async function waitReady(){const start=Date.now();while(Date.now()-start<10000){if(await b.evaluate('document.querySelector("video")?.readyState>=2'))return;await sleep(50);}throw Error('Video did not become playable');}
try{
 b=await browserSession(600,900);await b.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});await waitReady();
 for(const file of ['gameplay-web-1x.mp4']){
  await b.evaluate(`(()=>{const v=document.querySelector('video');v.src='/${file}';v.load();})()`);await waitReady();
  await b.evaluate('document.querySelector("video").play()');
  // Decoder startup depends on the host. Verify real advancement, not a fixed startup budget.
  const playbackStart=Date.now();
  while(Date.now()-playbackStart<10000&&await b.evaluate('document.querySelector("video").currentTime<1'))await sleep(100);
  const row=await b.evaluate('(()=>{const v=document.querySelector("video");return{duration:v.duration,time:v.currentTime,width:v.videoWidth,height:v.videoHeight,error:v.error?.message,quality:{total:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames}};})()');
  assert.ok(row.time>=1&&!row.error,file+JSON.stringify(row));rows.push({file,startupAndPlaybackWallMs:Date.now()-playbackStart,...row});await b.evaluate('document.querySelector("video").pause()');
 }
 assert.equal(b.exceptions.length,0);await writeFile(out+'/video-playback-check.json',JSON.stringify({platform:'Chrome HTML video playback, not native',passed:true,rows},null,2));console.log(JSON.stringify(rows));
}finally{if(b)await b.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
