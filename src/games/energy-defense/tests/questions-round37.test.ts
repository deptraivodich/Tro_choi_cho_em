import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { QuestionHistory } from '../../../shared/math/questionHistory';
import { EnergyQuestions, ENERGY_QUESTION_CONFIG, energyFingerprint, energyRecipes, seededEnergyQuestions, validateEnergyQuestion, type EnergyGroup } from '../logic/questions';
import { DefenseController } from '../logic/controller';
import { addFractions, simplifyFraction } from '../../../shared/math/fraction';

const memory=()=>new QuestionHistory({getItem:async()=>null,setItem:async()=>{}},'test');
test('same-denominator questions still have matching denominators after displayed simplification',()=>{
  for(const r of energyRecipes('same-denominator','training'))expect(r.a.den).toBe(r.b.den);
});
test('each configured domain has >=500 canonical addition problems, without counting distractors or order',()=>{
  const counts:Record<string,number>={};
  for(const group of ['warmup','training','challenge','endless'] as EnergyGroup[]){
    const keys=new Set(ENERGY_QUESTION_CONFIG[group].flatMap(f=>energyRecipes(f,group).map(r=>[r.a,r.b].map(f=>{const x=simplifyFraction(f);return `${x.num}/${x.den}`;}).sort().join('+'))));
    if(group==='endless')for(const family of ENERGY_QUESTION_CONFIG.challenge)for(const r of energyRecipes(family,'challenge'))keys.add([r.a,r.b].map(f=>`${f.num}/${f.den}`).sort().join('+'));
    expect(keys.size).toBeGreaterThanOrEqual(500);
    counts[group]=keys.size;
  }
  mkdirSync('artifacts/round37',{recursive:true});writeFileSync('artifacts/round37/energy-domain.json',JSON.stringify(counts,null,2));
});
test('5000 seeded samples per mode: exact, soluble, bounded and no immediate/recent repeats',async()=>{
  const reports=[];
  for(const group of ['warmup','training','challenge','endless'] as EnergyGroup[]){
    const h=memory();await h.ready;const generator=seededEnergyQuestions(3701,h),seen=new Set<string>(),recent:string[]=[],types:Record<string,number>={};
    let invalid=0,repeatRecent=0,fallbacks=0,sum=0,max=0;
    for(let i=0;i<5000;i++){
      if(i%40===0)generator.reset(); // simulate successive sessions, retaining stored memory
      const t=performance.now(),q=generator.next(group,group==='endless'?1+Math.floor(i/200):1),elapsed=performance.now()-t;
      sum+=elapsed;max=Math.max(max,elapsed);fallbacks+=Number(generator.last.fallback);
      const fp=energyFingerprint(q);if(recent.includes(fp))repeatRecent++;recent.push(fp);if(recent.length>200)recent.shift();seen.add(fp);
      types[generator.last.family]=(types[generator.last.family]??0)+1;
      if(!validateEnergyQuestion(q)||q.difficulty!==(group==='warmup'?'easy':group==='training'?'medium':'hard'))invalid++;
      if(q.availablePieces.length!==(group==='warmup'?4:group==='training'?5:6))invalid++;
      if(group==='warmup'&&q.availablePieces.some(p=>10*p.fraction.num%p.fraction.den!==0))invalid++;
    }
    const row={group,difficulty:group==='warmup'?'easy':group==='training'?'medium':'hard',samples:5000,unique:seen.size,repeatRate:1-seen.size/5000,invalid,repeatRecent,types,fallbacks,fallbackRate:fallbacks/5000,meanMs:sum/5000,maxMs:max};reports.push(row);
    expect(invalid).toBe(0);expect(repeatRecent).toBe(0);expect(seen.size).toBeGreaterThanOrEqual(500);
  }
  mkdirSync('artifacts/round37',{recursive:true});writeFileSync('artifacts/round37/energy-statistics.json',JSON.stringify(reports,null,2));
});
test('constant RNG terminates with 500 distinct questions before releasing session history',async()=>{
  const h=memory();await h.ready;const g=new EnergyQuestions(()=>0,h),seen=new Set<string>();
  for(let i=0;i<500;i++){const q=g.next('warmup');seen.add(energyFingerprint(q));}
  expect(seen.size).toBe(500);
});
test('fingerprint ignores formatting and commutative order; all mathematical solutions still grade',()=>{
  const q=new EnergyQuestions(()=>.7,memory()).next('training');
  expect(energyFingerprint({...q,availablePieces:[...q.availablePieces].reverse().map(p=>({...p,display:'same value'}))})).toBe(energyFingerprint(q));
  const controller=new DefenseController({problem:()=>q});controller.start();
  for(const p of q.availablePieces.filter(p=>p.id==='p0'||p.id==='p1'))controller.toggle(p.id);
  expect(controller.selectedSum()).toEqual(addFractions(q.availablePieces.find(p=>p.id==='p0')!.fraction,q.availablePieces.find(p=>p.id==='p1')!.fraction));
  expect(controller.fire()).toBe(true);controller.advanceTo(800);expect(controller.getSnapshot().correct).toBe(1);
});
