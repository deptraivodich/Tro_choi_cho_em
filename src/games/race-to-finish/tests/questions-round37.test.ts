import { mkdirSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { QuestionHistory } from '../../../shared/math/questionHistory';
import { PRNG } from '../../../shared/math/prng';
import { QuestionGenerator, raceFingerprint, validateRaceQuestion, calculationFingerprint, answerText, gradeAnswer, type Calculation, type QuestionDifficulty } from '../logic/questions';
import { rational } from '../logic/exactAnswer';

const memory=()=>new QuestionHistory({getItem:async()=>null,setItem:async()=>{}},'test');
test('canonical identity ignores commutative ordering, grouping, fraction formatting and answer placement',()=>{
  const a=rational(1,2),b=rational(3,4),c=rational(2);
  const x:Calculation={op:'+',left:a,right:{op:'+',left:b,right:c}},y:Calculation={op:'+',left:c,right:{op:'+',left:rational(2,4),right:b}};
  expect(calculationFingerprint(x)).toBe(calculationFingerprint(y));
  expect(calculationFingerprint({op:'−',left:a,right:b})).not.toBe(calculationFingerprint({op:'−',left:b,right:a}));
});
test('finite constructive witness proves >500 mathematical questions per phase independently of random samples',()=>{
  const counts:Record<string,number>={};
  for(const difficulty of ['medium','challenge'] as QuestionDifficulty[]){const keys=new Set<string>();
    for(let rank=0;rank<489*19;rank++){
      const a=24+rank%489,b=2+Math.floor(rank/489),c=3+rank%10;
      const expr:Calculation=difficulty==='medium'?{op:'+',left:rational(a*3),right:rational(b*11)}:
        {op:'+',left:{op:'×',left:{op:'−',left:rational(a),right:rational(b)},right:rational(c)},right:{op:'÷',left:rational(b*c),right:rational(b)}};
      keys.add(calculationFingerprint(expr));
    }
    counts[difficulty]=keys.size;expect(keys.size).toBeGreaterThan(500);
  }
  mkdirSync('artifacts/round37',{recursive:true});writeFileSync('artifacts/round37/race-domain-witness.json',JSON.stringify(counts,null,2));
});
test('5000 seeded questions in each phase across sessions: canonical recency, validator and exact grading',async()=>{
 const reports=[];
 for(const difficulty of ['medium','challenge'] as QuestionDifficulty[]){
  const history=memory();await history.ready;const rng=new PRNG(3702),seen=new Set<string>(),recent:string[]=[],categories:Record<string,number>={};
  let generator=new QuestionGenerator(()=>rng.next(),history),invalid=0,repeatRecent=0,fallbacks=0,sum=0,max=0;
  for(let i=0;i<5000;i++){
   if(i%50===0)generator=new QuestionGenerator(()=>rng.next(),history);
   const t=performance.now(),q=generator.next(difficulty==='medium'?'tile_10':'tile_40'),elapsed=performance.now()-t;
   sum+=elapsed;max=Math.max(max,elapsed);fallbacks+=Number(generator.last.fallback);
   const fp=raceFingerprint(q);seen.add(fp);if(recent.includes(fp))repeatRecent++;recent.push(fp);if(recent.length>200)recent.shift();
   categories[q.category]=(categories[q.category]??0)+1;
   if(!validateRaceQuestion(q)||q.difficulty!==difficulty||!gradeAnswer(q,answerText(q)))invalid++;
  }
  reports.push({difficulty,samples:5000,unique:seen.size,repeatRate:1-seen.size/5000,invalid,repeatRecent,categories,fallbacks,fallbackRate:fallbacks/5000,meanMs:sum/5000,maxMs:max});
  expect(invalid).toBe(0);expect(repeatRecent).toBe(0);expect(seen.size).toBeGreaterThanOrEqual(500);
 }
 writeFileSync('artifacts/round37/race-statistics.json',JSON.stringify(reports,null,2));
});
test.each(['medium','challenge'] as QuestionDifficulty[])('5000 questions within one %s session do not repeat canonically',async difficulty=>{
  const h=memory();await h.ready;const r=new PRNG(3709),g=new QuestionGenerator(()=>r.next(),h),seen=new Set<string>();
  for(let i=0;i<5000;i++)seen.add(raceFingerprint(g.next(difficulty==='medium'?'tile_10':'tile_40')));
  expect(seen.size).toBe(5000);
});
