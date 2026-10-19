import { QuestionSession, questionHistory, type QuestionHistory } from '../../../shared/math/questionHistory';
import { QUESTIONS } from './questions';
import type { SpeedQuestion } from '../types';

// Distance/time only occur in the educational panel. Simulation reads the five
// fixed targets from QUESTIONS, never these variable distances or durations.
export const TERRAIN_TIME_BOUNDS={min:2,max:241} as const;
export const TERRAIN_VARIANTS_PER_STAGE=240;
export function terrainFingerprint(q:SpeedQuestion){return `speed:${q.stage}:divide:${q.distance}/${q.time}:m:s`;}
export function validateTerrainQuestion(q:SpeedQuestion){
  const base=QUESTIONS[q.stage-1];return !!base&&Number.isSafeInteger(q.time)&&q.time>=2&&q.time<=241&&
    Number.isSafeInteger(q.distance)&&q.distance===base.correct_speed*q.time&&q.correct_speed===base.correct_speed&&
    q.sample_choices.length===4&&new Set(q.sample_choices).size===4&&
    q.sample_choices.every(v=>base.sample_choices.includes(v))&&q.sample_choices.filter(v=>v===q.correct_speed).length===1&&
    q.sample_choices.some(v=>v<q.correct_speed)&&q.sample_choices.some(v=>v>q.correct_speed);
}
export class TerrainQuestions {
  private cache=new Map<number,SpeedQuestion>();
  private sessions=new Map<number,QuestionSession>();
  lastFallback=false;
  constructor(private rng:()=>number=Math.random,private history:QuestionHistory=questionHistory){}
  reset(){this.cache.clear();this.sessions.clear();}
  forStage(stage:number):SpeedQuestion{
    if(!Number.isInteger(stage)||stage<1||stage>5)throw Error('Invalid terrain stage');
    const cached=this.cache.get(stage);if(cached)return cached;
    const base=QUESTIONS[stage-1],session=new QuestionSession(this.history,'terrain:stage'+stage);this.sessions.set(stage,session);
    const make=(time:number):SpeedQuestion=>({...base,time,distance:base.correct_speed*time,sample_choices:[...base.sample_choices]});
    let q:SpeedQuestion|undefined;this.lastFallback=false;
    for(let i=0;i<24;i++){const candidate=make(2+Math.floor(this.rng()*240));if(session.allows(terrainFingerprint(candidate))){q=candidate;break;}}
    if(!q){this.lastFallback=true;
      for(let t=2;t<=241;t++){const candidate=make(t);if(session.allows(terrainFingerprint(candidate))){q=candidate;break;}}
    }
    if(!q){const oldest=this.history.recent(session.group)[0];
      q=Array.from({length:240},(_,i)=>make(i+2)).find(c=>terrainFingerprint(c)===oldest)??make(2);
    }
    for(let i=3;i>0;i--){const j=Math.floor(this.rng()*(i+1));[q.sample_choices[i],q.sample_choices[j]]=[q.sample_choices[j],q.sample_choices[i]];}
    if(!validateTerrainQuestion(q))throw Error('Invalid generated speed question');
    session.accept(terrainFingerprint(q));this.cache.set(stage,q);return q;
  }
}
