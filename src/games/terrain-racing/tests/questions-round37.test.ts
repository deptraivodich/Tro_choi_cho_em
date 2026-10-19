import { mkdirSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { PRNG } from '../../../shared/math/prng';
import { QuestionHistory } from '../../../shared/math/questionHistory';
import { QUESTIONS } from '../data/questions';
import { TerrainQuestions, terrainFingerprint,validateTerrainQuestion } from '../data/questionGenerator';
import { chooseSpeed,initialSimulation } from '../engine/simulation';

test('enumerate all 240 variants per stage and verify original correct/low/high simulation classification',()=>{
 for(let stage=1;stage<=5;stage++){
  const base=QUESTIONS[stage-1],seen=new Set<string>();
  for(let time=2;time<=241;time++){
   const q={...base,time,distance:time*base.correct_speed};seen.add(terrainFingerprint(q));
   expect(validateTerrainQuestion(q)).toBe(true);
   const s={...initialSimulation(),stage,target:base.correct_speed,phase:'question' as const};
   for(const speed of q.sample_choices)expect(chooseSpeed(s,speed,s.session).outcome).toBe(speed===q.correct_speed?'correct':speed<q.correct_speed?'low':'high');
  }
  expect(seen.size).toBe(240);
 }
});
test('5000 samples for each stage across replay sessions; no repeated recent content and no changed target',async()=>{
 const rows=[];
 for(let stage=1;stage<=5;stage++){
  const h=new QuestionHistory({getItem:async()=>null,setItem:async()=>{}},'test');await h.ready;
  const rng=new PRNG(3703+stage),g=new TerrainQuestions(()=>rng.next(),h),seen=new Set<string>(),recent:string[]=[];
  let invalid=0,repeatedRecent=0,fallbacks=0,sum=0,max=0;
  for(let i=0;i<5000;i++){
   g.reset();const t=performance.now(),q=g.forStage(stage),elapsed=performance.now()-t,fp=terrainFingerprint(q);
   sum+=elapsed;max=Math.max(max,elapsed);fallbacks+=Number(g.lastFallback);seen.add(fp);
   if(recent.includes(fp))repeatedRecent++;recent.push(fp);if(recent.length>200)recent.shift();
   if(!validateTerrainQuestion(q))invalid++;
   if(i===0)expect(g.forStage(stage)).toBe(q); // rerenders do not consume history
  }
  rows.push({stage,difficulty:'fixed-stage-target',samples:5000,unique:seen.size,repeatRate:1-seen.size/5000,invalid,repeatedRecent,types:{'find-speed':5000},fallbacks,fallbackRate:fallbacks/5000,meanMs:sum/5000,maxMs:max});
  expect(invalid).toBe(0);expect(repeatedRecent).toBe(0);expect(seen.size).toBe(240);
 }
 mkdirSync('artifacts/round37',{recursive:true});writeFileSync('artifacts/round37/terrain-statistics.json',JSON.stringify(rows,null,2));
});
