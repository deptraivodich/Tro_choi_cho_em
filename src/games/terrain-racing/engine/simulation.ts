import timing from '../assets/animation_timing.json';
import type { Phase, Simulation } from '../types';
import { finaleComplete } from './world';

const T = timing.seconds;
export function initialSimulation(session = 1, target = 20): Simulation {
  'worklet';
  return {session,revision:0,phase:'chase',stage:1,elapsed:0,time:0,speed:target,target,
    outcome:'correct',paused:false,completed:0};
}
export function phaseDuration(s: Simulation): number {
  'worklet';
  switch(s.phase){
    case 'question': case 'result': case 'victory': return Infinity;
    case 'impact': return s.outcome==='correct'?T.impact_correct:T.impact_wrong;
    case 'settle': return T.settle_wrong;
    case 'heroRun': return T.hero_run;
    case 'policeLaunch': return T.police_launch;
    case 'policeJump': return T.police_jump;
    case 'policeRoll': return T.police_roll_final;
    case 'escape': return T.escape_final;
    default: return T[s.phase];
  }
}
export function chooseSpeed(s: Simulation, speed: number, session: number): Simulation {
  'worklet';
  if(s.session!==session || s.paused || s.phase!=='question' || !Number.isFinite(speed))return s;
  return {...s,phase:'launch',elapsed:0,revision:s.revision+1,speed,
    outcome:speed===s.target?'correct':speed<s.target?'low':'high'};
}
function nextPhase(s: Simulation): Phase {
  'worklet';
  switch(s.phase){
    case 'chase':return 'collapse';case 'collapse':return 'question';case 'launch':return 'jump';
    case 'jump':return 'impact';case 'impact':return s.outcome==='correct'?'heroRun':'settle';
    case 'settle':return 'result';case 'heroRun':return 'policeLaunch';case 'policeLaunch':return 'policeJump';
    case 'policeJump':return s.stage===5?'policeRoll':'transition';case 'transition':return 'chase';
    case 'policeRoll':return 'escape';case 'escape':return 'victory';default:return s.phase;
  }
}
/** One clock. Large deltas are discarded; no background catch-up or independent camera timer. */
export function advanceSimulation(s: Simulation, delta: number, targets: readonly number[]): Simulation {
  'worklet';
  if(s.paused || !Number.isFinite(delta) || delta<=0)return s;
  const dt=Math.min(delta,.05);
  if(s.phase==='result'||s.phase==='victory')return s;
  if(s.phase==='question')return {...s,time:s.time+dt};
  let next={...s,time:s.time+dt},remaining=dt;
  while(remaining>1e-9){
    const duration=phaseDuration(next);
    const step=Math.min(remaining,Math.max(0,duration-next.elapsed));
    next={...next,elapsed:next.elapsed+step};remaining-=step;
    if(next.elapsed<duration-1e-8)break;
    if(next.phase==='escape'&&!finaleComplete(next))return {...next,elapsed:next.elapsed+remaining};
    const previous=next.phase,phase=nextPhase(next);
    const stage=previous==='transition'?next.stage+1:next.stage;
    next={...next,phase,stage,elapsed:0,revision:next.revision+1,
      completed:previous==='impact'&&next.outcome==='correct'?next.stage:next.completed,
      ...(previous==='transition'?{target:targets[stage-1],speed:targets[stage-1],outcome:'correct' as const}:{})};
    if(phase==='question'||phase==='result'||phase==='victory')break;
  }
  return next;
}
