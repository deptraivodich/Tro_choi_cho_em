import type { EnergyDefenseProblem, EnergyPiece } from '../../../shared/math/generators';
import { addFractions, areFractionsEqual, lcm, simplifyFraction, type Fraction } from '../../../shared/math/fraction';
import { QuestionSession, questionHistory, type QuestionHistory } from '../../../shared/math/questionHistory';
import { PRNG } from '../../../shared/math/prng';
import type { Mode } from './config';

export type EnergyGroup='warmup'|'training'|'challenge'|'endless';
type Family='natural'|'tenths'|'hundredths'|'same-denominator'|'unlike-denominators'|'mixed';
type Recipe={family:Family;a:Fraction;b:Fraction;fingerprint:string;targetKey:string};
export const ENERGY_QUESTION_CONFIG:Record<EnergyGroup,readonly Family[]>={
  warmup:['natural','tenths','tenths','tenths'],
  training:['hundredths','same-denominator','unlike-denominators','mixed'],
  challenge:['unlike-denominators','unlike-denominators','mixed','hundredths'],
  endless:['hundredths','same-denominator','unlike-denominators','mixed'],
};
const key=(f:Fraction)=>{const r=simplifyFraction(f);return r.num+'/'+r.den;};
const catalogs=new Map<string,Recipe[]>();
/** Parameter recipes, not a stored bank of rendered questions. Canonical dedup is exact. */
export function energyRecipes(family:Family,group:EnergyGroup='training'):readonly Recipe[]{
  const catalogKey=group+':'+family,hard=group==='challenge';
  const cached=catalogs.get(catalogKey);if(cached)return cached;
  const result:Recipe[]=[],seen=new Set<string>();
  const put=(a:Fraction,b:Fraction)=>{a=simplifyFraction(a);b=simplifyFraction(b);const targetKey=key(addFractions(a,b)),k=[key(a),key(b)].sort().join('+');
    const r={family,a,b,targetKey,fingerprint:'energy:'+targetKey+':'+k};
    if(!seen.has(k)){seen.add(k);result.push(r);}};
  if(family==='natural')for(let a=1;a<=9;a++)for(let b=a;b<=9;b++)if(a+b<=12)put({num:a,den:1},{num:b,den:1});
  if(family==='tenths')for(let a=1;a<=40;a++)for(let b=a;b<=40;b++)if(a+b<=60&&(a%10||b%10))put({num:a,den:10},{num:b,den:10});
  if(family==='hundredths')for(let a=hard?3:5;a<=(hard?199:155);a+=hard?2:5)for(let b=a;b<=(hard?199:155);b+=hard?2:5)put({num:a,den:100},{num:b,den:100});
  if(family==='same-denominator')for(const den of [3,4,5,6,8,10,12])for(let a=1;a<den;a++)for(let b=a;b<den;b++){
    const x=simplifyFraction({num:a,den}),y=simplifyFraction({num:b,den});
    if(x.den===y.den)put(x,y);
  }
  if(family==='unlike-denominators')for(const da of (hard?[3,4,5,6,8,10,12]:[2,3,4,5,6]))for(const db of (hard?[3,4,5,6,8,10,12]:[2,3,4,5,6]))for(let a=1;a<da;a++)for(let b=1;b<db;b++){
    const x=simplifyFraction({num:a,den:da}),y=simplifyFraction({num:b,den:db});if(x.den!==y.den&&(!hard||Math.max(x.den,y.den)>=8))put(x,y);
  }
  if(family==='mixed')for(let whole=1;whole<=(hard?3:1);whole++)for(const da of (hard?[5,6,8]:[3,4]))for(let a=1;a<da;a++)for(const db of (hard?[3,4,5,8]:[2,3,4]))for(let b=1;b<db;b++)put({num:whole*da+a,den:da},{num:b,den:db});
  catalogs.set(catalogKey,result);return result;
}
export function energyFingerprint(q:EnergyDefenseProblem):string {
  // Enumerate every valid solution, so swapping a commutative pair or formatting
  // cannot manufacture novelty. Distractor permutations are deliberately ignored.
  const solutions:string[]=[];
  for(let mask=1;mask<(1<<q.availablePieces.length);mask++){
    const terms=q.availablePieces.filter((_,i)=>mask&(1<<i));
    const sum=terms.reduce((s,p)=>addFractions(s,p.fraction),{num:0,den:1});
    if(areFractionsEqual(sum,q.targetFraction))solutions.push(terms.map(p=>key(p.fraction)).sort().join('+'));
  }
  return 'energy:'+key(q.targetFraction)+':'+[...new Set(solutions)].sort().join('|');
}
export function validateEnergyQuestion(q:EnergyDefenseProblem):boolean {
  if(q.availablePieces.length<2||q.availablePieces.length>6||new Set(q.availablePieces.map(p=>p.id)).size!==q.availablePieces.length)return false;
  if([q.targetFraction,...q.availablePieces.map(p=>p.fraction)].some(f=>!Number.isSafeInteger(f.num)||!Number.isSafeInteger(f.den)||f.num<=0||f.den<=0))return false;
  let count=0;for(let m=1;m<1<<q.availablePieces.length;m++){
    const sum=q.availablePieces.reduce((s,p,i)=>m&(1<<i)?addFractions(s,p.fraction):s,{num:0,den:1});
    if(areFractionsEqual(sum,q.targetFraction))count++;
  }
  return count>0&&count===q.validCombosCount;
}
function display(f:Fraction,decimal:boolean):string{
  const r=simplifyFraction(f);
  if(decimal)return String(r.num/r.den).replace('.',',');
  if(r.den===1)return String(r.num);
  const whole=Math.floor(r.num/r.den);return whole?`${whole} ${r.num%r.den}/${r.den}`:`${r.num}/${r.den}`;
}
function materialize(r:Recipe,mode:Mode,id:number,rng:()=>number):EnergyDefenseProblem {
  const decimal=['natural','tenths','hundredths'].includes(r.family),target=addFractions(r.a,r.b);
  const pieceCount=mode==='easy'?4:mode==='medium'?5:6;
  // Integer-grid subset checks keep plausible distractors below the target where
  // possible, without introducing another solution or teaching "pick the two smallest".
  const unit=decimal?(r.family==='natural'?1:r.family==='tenths'?10:100):lcm(r.a.den,r.b.den);
  const targetUnits=target.num*unit/target.den,values=[r.a,r.b],units=values.map(f=>f.num*unit/f.den);
  const candidates=decimal?Array.from({length:Math.min(targetUnits-1,r.family==='natural'?12:r.family==='tenths'?40:199)},(_,i)=>i+1):
    [r.a.den,r.b.den].flatMap(den=>Array.from({length:den-1},(_,i)=>(i+1)*unit/den));
  for(let attempt=0;attempt<24&&values.length<pieceCount&&candidates.length;attempt++){
    const v=candidates[Math.floor(rng()*candidates.length)];if(units.includes(v))continue;
    let extra=false;for(let mask=0;mask<1<<units.length;mask++){let sum=v;for(let i=0;i<units.length;i++)if(mask&(1<<i))sum+=units[i];if(sum===targetUnits){extra=true;break;}}
    if(!extra){units.push(v);values.push(simplifyFraction({num:v,den:unit}));}
  }
  while(values.length<pieceCount)values.push(addFractions(target,{num:values.length-1,den:1}));
  const pieces:EnergyPiece[]=values.map((f,i)=>({id:'p'+i,fraction:f,numericVal:f.num/f.den,display:display(f,decimal)}));
  for(let i=pieces.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pieces[i],pieces[j]]=[pieces[j],pieces[i]];}
  return {id:'edq-'+id,difficulty:mode,targetFraction:target,targetDisplay:display(target,decimal),targetNumeric:target.num/target.den,
    availablePieces:pieces,explanation:`${display(r.a,decimal)} + ${display(r.b,decimal)} = ${display(target,decimal)}`,
    questionType:mode==='easy'?'decimals_warmup':mode==='medium'?'hundredths_fractions':'mixed_combo',validCombosCount:1};
}
/** Selection-screen state is a preview, not a question asked during a run. */
export function energyPreview(mode:Mode):EnergyDefenseProblem {
  const group:EnergyGroup=mode==='easy'?'warmup':mode==='medium'?'training':'challenge';
  return materialize(energyRecipes(ENERGY_QUESTION_CONFIG[group][0],group)[0],mode,0,()=>0);
}
export class EnergyQuestions {
  private sessions=new Map<EnergyGroup,QuestionSession>();
  private index=0;
  last={family:'' as string,fallback:false};
  private lastTarget=new Map<EnergyGroup,string>();
  constructor(private rng:()=>number=()=>Math.random(),private history:QuestionHistory=questionHistory){}
  reset(){this.sessions.clear();}
  next(group:EnergyGroup,wave=1):EnergyDefenseProblem{
    let session=this.sessions.get(group);if(!session){session=new QuestionSession(this.history,'energy:'+group);this.sessions.set(group,session);}
    const families=group==='endless'&&wave>6?ENERGY_QUESTION_CONFIG.challenge:ENERGY_QUESTION_CONFIG[group];
    const level=group==='endless'?(wave>6?'challenge':'training'):group;
    const mode:Mode=group==='warmup'?'easy':group==='training'?'medium':'hard';
    const family=families[Math.floor(this.rng()*families.length)],pool=energyRecipes(family,level);
    let chosen:Recipe|undefined,fallback=false;
    const can=(r:Recipe)=>session!.allows(r.fingerprint);
    for(let i=0;i<24;i++){const r=pool[Math.floor(this.rng()*pool.length)];if(can(r)&&r.targetKey!==this.lastTarget.get(group)){chosen=r;break;}}
    if(!chosen){fallback=true;
      // Finite scan guarantees an unused question if the configured domain has one.
      for(const f of [...new Set(families)]){chosen=energyRecipes(f,level).find(can);if(chosen)break;}
    }
    if(!chosen){
      // Session novelty wins over cross-session recency when the two conflict.
      const recent=this.history.recent('energy:'+group);
      const unused=[...new Set(families)].flatMap(f=>energyRecipes(f,level)).filter(r=>session!.unused(r.fingerprint));
      chosen=unused.sort((a,b)=>recent.indexOf(a.fingerprint)-recent.indexOf(b.fingerprint))[0];
    }
    if(!chosen){
      // Domain exhausted in this session: release only session memory, then choose
      // least-recent eligible content (or oldest entry if every candidate is recent).
      session=new QuestionSession(this.history,'energy:'+group);this.sessions.set(group,session);
      for(const f of [...new Set(families)]){chosen=energyRecipes(f,level).find(can);if(chosen)break;}
      if(!chosen){const recent=this.history.recent('energy:'+group);chosen=[...pool].sort((a,b)=>recent.indexOf(a.fingerprint)-recent.indexOf(b.fingerprint))[0];}
    }
    const q=materialize(chosen!,mode,++this.index,this.rng);session.accept(chosen!.fingerprint);this.lastTarget.set(group,chosen!.targetKey);
    this.last={family:chosen!.family,fallback};return q;
  }
}
export function seededEnergyQuestions(seed:number,history:QuestionHistory){const r=new PRNG(seed);return new EnergyQuestions(()=>r.next(),history);}
