import { QUESTIONS, validateQuestions } from '../data/questions';
import { advanceSimulation, chooseSpeed, initialSimulation, phaseDuration } from '../engine/simulation';
import { finaleComplete, paddedHalfExtent, spriteSeparation, worldAt } from '../engine/world';
import type { Phase, Simulation } from '../types';

const targets=QUESTIONS.map(q=>q.correct_speed);
const step=(s:Simulation,dt=1/120)=>advanceSimulation(s,dt,targets);
function until(s:Simulation,phase:Phase):Simulation {
  for(let i=0;i<100000&&s.phase!==phase;i++)s=step(s);
  if(s.phase!==phase)throw new Error(`Never reached ${phase}; stopped at ${s.phase}`);
  return s;
}
function answer(s:Simulation,value=s.target):Simulation {
  return chooseSpeed(until(s,'question'),value,s.session);
}

test('five exact handoff questions, four distinct positive answers, low and high alternatives',()=>{
  expect(targets).toEqual([20,30,25,24,30]);
  expect(()=>validateQuestions(QUESTIONS)).not.toThrow();
  expect(()=>validateQuestions(QUESTIONS.slice(1))).toThrow();
  expect(()=>validateQuestions(QUESTIONS.map((q,i)=>i===0?{...q,sample_choices:[20,20,30,40]}:q))).toThrow();
});
test('questions never expire, first choice wins, stale session and pause reject input',()=>{
  let s=until(initialSimulation(),'question');
  for(let i=0;i<3600;i++)s=step(s,1/60);
  expect(s.phase).toBe('question');expect(s.elapsed).toBe(0);
  expect(chooseSpeed({...s,paused:true},20,s.session).phase).toBe('question');
  expect(chooseSpeed(s,20,s.session+1)).toBe(s);
  const first=chooseSpeed(s,10,s.session);
  expect(chooseSpeed(first,30,s.session)).toBe(first);expect(first.outcome).toBe('low');
});
test('correct five-stage play is forward, continuous, collision-free, and ends only after physical escape',()=>{
  let s=initialSimulation(),previous=worldAt(s),maxStep=0,minGap=Infinity,transitions=0;
  const phases:string[]=[],policeLandings:number[]=[];
  for(let i=0;i<15000;i++){
    if(s.phase==='question')s=chooseSpeed(s,s.target,s.session);
    const old=s,next=step(s),w=worldAt(next);
    for(const field of ['H','P','C'] as const){
      expect(w[field]).toBeGreaterThanOrEqual(previous[field]-1e-6);
      maxStep=Math.max(maxStep,w[field]-previous[field]);
      expect(w[field]-previous[field]).toBeLessThan(3);
    }
    minGap=Math.min(minGap,spriteSeparation(w));
    if(old.stage!==next.stage){transitions++;expect(next.phase).toBe('chase');}
    if(old.phase==='policeJump'&&next.phase!=='policeJump'){
      policeLandings.push(next.stage);expect(w.P).toBeGreaterThan(w.gap+89);expect(w.police.jump).toBe(0);
    }
    const key=next.phase+'-'+next.stage;if(phases.at(-1)!==key)phases.push(key);
    if(next.phase==='victory'){
      expect(old.phase).toBe('escape');expect(finaleComplete({...old,elapsed:phaseDuration(old)})).toBe(true);
      expect(w.hero.y+paddedHalfExtent(164,w.hero.scale,w.hero.angle)).toBeLessThan(0);
      expect(w.police.frame).toBe(2);expect(w.hero.frame).toBe(0);
      s=next;break;
    }
    s=next;previous=w;
  }
  expect(s.phase).toBe('victory');expect(s.completed).toBe(5);expect(transitions).toBe(4);
  expect(policeLandings).toEqual([1,2,3,4,5]);expect(minGap).toBeGreaterThan(28);
  expect(maxStep).toBeLessThan(2.7);
  expect(phases.slice(-4)).toEqual(['policeJump-5','policeRoll-5','escape-5','victory-5']);
});
test.each([1,2,3,4])('position AND velocity continuity across stage boundary %i',stage=>{
  const s={...initialSimulation(),stage,phase:'transition' as const,target:targets[stage-1],elapsed:3};
  const a=worldAt(s),before=worldAt({...s,elapsed:3-.0001});
  const next={...s,stage:stage+1,phase:'chase' as const,elapsed:0};
  const b=worldAt(next),after=worldAt({...next,elapsed:.0001});
  for(const field of ['H','P','C'] as const){
    expect(a[field]).toBeCloseTo(b[field],8);
    expect((a[field]-before[field])/.0001).toBeCloseTo((after[field]-b[field])/.0001,0);
  }
});
test.each([1,2,3,4,5])('all three outcomes on stage %i',stage=>{
  let s=initialSimulation();
  while(s.stage<stage){s=answer(s);s=until(s,'transition');s={...s,elapsed:3-1/120};s=step(s);}
  const low=until(answer(s,targets[stage-1]-10),'impact');
  const fallen=worldAt({...low,elapsed:1.2});
  expect(fallen.H).toBeLessThan(fallen.gap+89);expect(fallen.hero.alpha).toBe(0);
  expect(fallen.hero.jump).toBeLessThan(0);expect(fallen.hero.frame).toBe(0);
  expect(until(low,'result').outcome).toBe('low');
  const high=until(answer(s,targets[stage-1]+10),'impact');
  const rolled=worldAt({...high,elapsed:1.2});
  expect(rolled.H).toBeGreaterThan(rolled.gap+89);expect(rolled.hero.frame).toBe(2);expect(rolled.hero.alpha).toBe(1);
  expect(until(high,'result').outcome).toBe('high');
  const correct=until(answer(s),'impact');
  expect(worldAt(correct).hero.frame).toBe(0);expect(worldAt(correct).H).toBeGreaterThan(worldAt(correct).gap+89);
});
test.each(['chase','jump','transition','policeRoll'] as Phase[])('pause at %s freezes state; oversized resume delta is bounded',phase=>{
  const s={...initialSimulation(),phase,stage:phase==='policeRoll'?5:1,elapsed:.4,paused:true};
  const frozen=step(s,90);expect(frozen).toBe(s);expect(worldAt(frozen)).toEqual(worldAt(s));
  const resumed=step({...s,paused:false},90);expect(resumed.elapsed).toBeCloseTo(.45);
  expect(resumed.phase).toBe(phase);
});
test('replay has fresh session and no old answer can change it',()=>{
  const lost=until(answer(initialSimulation(),10),'result');
  const replay=initialSimulation(lost.session+1);
  expect(replay.stage).toBe(1);expect(worldAt(replay).H).toBe(0);
  expect(chooseSpeed(until(replay,'question'),30,lost.session).phase).toBe('question');
});
