import { DefenseController } from '../logic/controller';
import { endlessEnemyCount, NORMAL_LIMIT_MS, WAVE_CONFIG, type Mode } from '../logic/config';
import { pathHeading, pathPosition, travelled } from '../logic/path';
import type { EnergyDefenseProblem } from '../../../shared/math/generators';
const problem=(mode:Mode):EnergyDefenseProblem=>({id:'fixture',difficulty:mode,targetDisplay:'1',targetFraction:{num:1,den:1},targetNumeric:1,availablePieces:[{id:'one',display:'1',fraction:{num:1,den:1},numericVal:1}],explanation:'',questionType:'decimals_warmup',validCombosCount:1});
const make=(mode:Mode='easy')=>{const c=new DefenseController({random:()=>0,problem});c.selectMode(mode);return c;};
function play(c:DefenseController,until:()=>boolean,max=10000){
  let steps=0;
  while(!until()&&steps++<max){
    const s=c.getSnapshot();
    if(s.status!=='running')break;
    if(s.enemies.length&&!s.shot){c.toggle('one');c.fire();}
    c.advanceTo(c.now+100);
  }
  expect(until()).toBe(true);
}
test.each([['easy',[3,3,3,5,5],19],['medium',[2,2,3,5,7],19],['hard',[5,5,5,7,7,10,10],49]] as const)('mode %s has the exact waves and sequential spawn totals',(mode,waves,total)=>{
  expect(WAVE_CONFIG[mode]).toEqual(waves);
  const c=make(mode);const spawned=new Map<number,number>();const ids=new Set<number>();let previousWave=1,previousSpawn=0;
  c.subscribe(()=>{const s=c.getSnapshot();if(s.wave!==previousWave){expect(s.wave).toBe(previousWave+1);previousWave=s.wave;previousSpawn=0;}
    if(s.spawned>previousSpawn){expect(s.spawned-previousSpawn).toBe(1);previousSpawn=s.spawned;spawned.set(s.wave,s.spawned);}
    for(const e of s.enemies)ids.add(e.id);
  });
  c.start();play(c,()=>c.getSnapshot().status!=='running');
  expect([...spawned.values()]).toEqual(waves);expect(ids.size).toBe(total);
  const s=c.getSnapshot();expect(s.kills).toBe(total);expect(s.status).toBe(mode==='hard'?'offer':'won');
});
test.each([[1,10],[3,10],[4,13],[6,13],[7,16],[9,16],[10,19],[12,19],[13,22],[15,22],[16,25],[18,25],[19,28],[1000000,1000009]])('endless wave %i contains %i enemies',(wave,count)=>expect(endlessEnemyCount(wave)).toBe(count));
test('invalid endless wave numbers are rejected',()=>{for(const n of [0,-1,1.5,Infinity])expect(()=>endlessEnemyCount(n)).toThrow();});
test('selection is inert until Start, and running mode cannot be changed',()=>{
  const c=make();c.advanceTo(50000);expect(c.now).toBe(0);expect(c.getSnapshot().enemies).toHaveLength(0);expect(c.getSnapshot().elapsedSeconds).toBe(0);
  expect(c.selectMode('medium')).toBe(true);c.start();expect(c.selectMode('hard')).toBe(false);expect(c.getSnapshot().mode).toBe('medium');expect(c.start()).toBe(false);
});
test('spawning all configured enemies does not complete a wave while they remain alive',()=>{
  const c=make();c.start();c.advanceTo(12000);const s=c.getSnapshot();expect(s.spawned).toBe(3);expect(s.enemies).toHaveLength(3);expect(s.wave).toBe(1);
  c.advanceTo(12000);expect(c.getSnapshot()).toBe(s);
});
test('pause preserves a shot and repeated fire/advance never doubles rewards',()=>{
  const c=make();c.start();c.advanceTo(2000);c.toggle('one');expect(c.fire()).toBe(true);expect(c.fire()).toBe(false);c.advanceTo(2200);c.pause();c.advanceTo(10000);
  expect(c.now).toBe(2200);expect(c.getSnapshot().kills).toBe(0);c.resume();c.advanceTo(2600);expect(c.getSnapshot().kills).toBe(1);expect(c.getSnapshot().score).toBe(25);c.advanceTo(2600);expect(c.getSnapshot().kills).toBe(1);
});
test('the final death effect must finish before advancing and repeated ticks advance only once',()=>{
  const c=make();c.start();play(c,()=>c.getSnapshot().kills===2);
  while(!c.getSnapshot().enemies.length)c.advanceTo(c.now+100);
  c.toggle('one');c.fire();const end=c.now+600;c.advanceTo(end-1);
  expect(c.getSnapshot().wave).toBe(1);expect(c.getSnapshot().shot).not.toBeNull();
  c.advanceTo(end);expect(c.getSnapshot().wave).toBe(2);expect(c.getSnapshot().spawned).toBe(0);
  c.advanceTo(end);expect(c.getSnapshot().wave).toBe(2);
});
test('escape damages the base once and never awards a kill',()=>{
  const c=new DefenseController({random:()=>0,problem,spawnIntervalMs:40000});c.start();c.advanceTo(31000);
  expect(c.getSnapshot().hp).toBe(85);expect(c.getSnapshot().processed).toBe(1);expect(c.getSnapshot().kills).toBe(0);c.advanceTo(31500);expect(c.getSnapshot().hp).toBe(85);
});
test('an escaping target cannot delete a different enemy or earn endless kill points',()=>{
  const c=make('hard');c.start();play(c,()=>c.getSnapshot().status==='offer');c.acceptEndless(true);
  c.advanceTo(c.now+30300);const target=c.getSnapshot().enemies[0];c.toggle('one');c.fire();c.advanceTo(c.now+600);
  expect(c.getSnapshot().enemies.some(e=>e.id===target.id)).toBe(false);expect(c.getSnapshot().endlessScore).toBe(0);expect(c.getSnapshot().endlessKills).toBe(0);expect(c.getSnapshot().hp).toBe(85);
});
test('declining Endless wins Challenge and does not spawn new enemies',()=>{
  const c=make('hard');expect(c.getSnapshot().endless).toBe(false);c.acceptEndless(true);expect(c.getSnapshot().endless).toBe(false);
  c.start();play(c,()=>c.getSnapshot().status==='offer');const now=c.now;c.advanceTo(now+10000);expect(c.now).toBe(now);c.acceptEndless(false);
  expect(c.getSnapshot().status).toBe('won');expect(c.getSnapshot().endless).toBe(false);expect(c.getSnapshot().enemies).toHaveLength(0);
});
test('Endless preserves HP, starts counters at zero and scores only Endless kills',()=>{
  const c=make('hard');c.start();c.advanceTo(30500);expect(c.getSnapshot().hp).toBe(85);play(c,()=>c.getSnapshot().status==='offer');
  expect(c.getSnapshot().score).toBe(48*25);c.acceptEndless(true);expect(c.getSnapshot()).toMatchObject({hp:85,wave:1,waveTotal:10,endlessScore:0,endlessKills:0,endlessSeconds:0});
  play(c,()=>c.getSnapshot().endlessKills===5);expect(c.getSnapshot().endlessScore).toBe(50);
  play(c,()=>c.getSnapshot().wave===4);expect(c.getSnapshot()).toMatchObject({endlessCompleted:3,waveTotal:13,endlessKills:30,endlessScore:300});
});
test('Endless has no inherited six-minute timeout and no finite winning wave',()=>{
  const c=make('hard');c.start();play(c,()=>c.getSnapshot().status==='offer');c.acceptEndless(true);play(c,()=>c.now>NORMAL_LIMIT_MS+1000);
  expect(c.getSnapshot().status).toBe('running');expect(c.getSnapshot().endless).toBe(true);expect(c.getSnapshot().wave).toBeGreaterThan(7);
});
test('timeout is a loss and cannot award victory before all waves',()=>{
  const c=new DefenseController({random:()=>0,problem,spawnIntervalMs:NORMAL_LIMIT_MS+1});c.start();c.advanceTo(2000);c.toggle('one');c.fire();c.advanceTo(NORMAL_LIMIT_MS);
  expect(c.getSnapshot().status).toBe('lost');expect(c.getSnapshot().reason).toBe('timeout');expect(c.getSnapshot().wave).toBe(1);
});
test('exit records only a finished Endless run once; selecting/replaying cannot retain old entities',()=>{
  const c=make('hard');c.start();play(c,()=>c.getSnapshot().status==='offer');c.acceptEndless(true);play(c,()=>c.getSnapshot().endlessKills===2);
  expect(c.getEndlessRecord()).toBeNull();c.finish('exit');const r=c.getEndlessRecord();expect(r).toMatchObject({score:20,kills:2,reason:'exit'});c.finish('defeat');expect(c.getEndlessRecord()).toBe(r);
  c.chooseAgain();expect(c.getSnapshot().enemies).toHaveLength(0);c.start();expect(c.getEndlessRecord()).toBeNull();expect(c.getSnapshot().endlessScore).toBe(0);expect(c.getSnapshot().shot).toBeNull();
});
test('continuous path position is independent of rendering and smooth heading crosses corners',()=>{
  for(const step of [1000/30,1000/60,1000/120]){let now=0;while(now+step<12000)now+=step;now=12000;expect(pathPosition(travelled({bornAt:0,speed:1.3},now))).toEqual({x:156,y:70});}
  expect(pathPosition(170)).toEqual({x:170,y:70});expect(pathPosition(170.1).y).toBeCloseTo(70.1);
  expect(Math.abs(pathHeading(169.9)-pathHeading(170.1))).toBeLessThan(.05);
});
