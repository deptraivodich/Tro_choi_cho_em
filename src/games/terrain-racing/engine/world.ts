import { bell, clamp, ease, herm } from '../animation/math';
import type { Simulation, World } from '../types';

export const ANCHOR = 430;
export const HERO_CELL = 164;
export const POLICE_CELL = 168;
export const ROAD_STRIDE = 936;

export function stageBase(stage: number): number {
  'worklet';
  return stage === 1 ? 0 : 1460.5 + (stage - 2) * 1554;
}
export function stageApproach(stage: number): number {
  'worklet';
  return stage === 1 ? 168 : 261.5;
}
export function gapWorld(stage: number): number {
  'worklet';
  return stageBase(stage) + stageApproach(stage) + 202;
}

/** Exact world paths from the Canvas prototype, with explicit padded sprite bounds. */
export function worldAt(s: Simulation): World {
  'worklet';
  const B = stageBase(s.stage), Q = stageApproach(s.stage), t = s.elapsed;
  const correct = s.outcome === 'correct';
  const duration = s.phase === 'impact' && correct ? .55 :
    ({ chase:2.2, collapse:1.2, launch:.9, jump:1.4, impact:1.2, settle:.8,
      heroRun:.3, policeLaunch:1.2, policeJump:1.4, transition:3, policeRoll:1.8,
      escape:2.2, question:1, result:1, victory:1 }[s.phase]);
  const p = clamp(t / duration);
  let H=Q, P=Q-170, C=Q, jh=0, jp=0, hs=.88, ps=.8, hf=0, pf=0, ha=0, pa=0, alpha=1, px=0;
  switch (s.phase) {
    case 'chase': H=herm(0,Q-36,s.stage===1?60:145,60,t,2.2);P=H-170;C=H;break;
    case 'collapse': H=herm(Q-36,Q,60,0,t,1.2);P=H-170;C=H;break;
    case 'launch': H=herm(Q,Q+52,0,80,t,.9);break;
    case 'jump':
      H=herm(Q+52,Q+(s.outcome==='low'?202:357),80,145,t,1.4);
      C=herm(Q,Q+180,0,120,t,1.4);jh=bell(p)*(s.outcome==='low'?28:58);
      hs*=1+bell(p)*.1;ha=bell(p)*.025;break;
    case 'impact': case 'settle': case 'result': {
      const q=s.phase==='impact'?p:1;
      if(correct){H=herm(Q+357,Q+437,145,145,t,.55);C=herm(Q+180,Q+220,120,20,t,.55);}
      if(s.outcome==='low'){
        H=Q+202+8*ease(q);C=Q+180;hs*=1-ease(q)*.7;
        // Ground shadow stays at the gap; body descends into it before vanishing.
        jh=-48*ease(q);ha=q*.4;alpha=1-clamp((q-.6)/.4);
      }
      if(s.outcome==='high'){
        H=Q+357+90*ease(q);C=Q+180;
        hf=2*ease(q);ha=.3*ease(q);jh=16*bell(q);
      }
      break;
    }
    case 'heroRun': H=Q+437+145*t;C=herm(Q+220,Q+240,20,110,t,.3);break;
    case 'policeLaunch':
      H=Q+480.5+145*t;P=herm(Q-170,Q+52,0,80,t,1.2);C=herm(Q+240,Q+430,110,160,t,1.2);break;
    case 'policeJump':
      H=Q+654.5+145*t;P=herm(Q+52,Q+357,80,145,t,1.4);
      C=herm(Q+430,Q+620,160,160,t,1.4);jp=58*bell(p);ps*=1+.1*bell(p);break;
    case 'transition':
      H=Q+857.5+145*t;P=herm(Q+357,Q+1122.5,145,145,t,3);C=herm(Q+620,Q+1292.5,160,145,t,3);break;
    case 'policeRoll':
      H=Q+857.5+145*t;P=herm(Q+357,Q+670,145,0,t,1.8);C=herm(Q+620,Q+764,160,0,t,1.8);
      pf=ease(p)*2;pa=.32*ease(p);px=34*ease(p);jp=12*bell(p);break;
    case 'escape': case 'victory':
      // Extend the escape curve linearly if a future sprite/viewport needs more clearance.
      H=s.phase==='victory'?Q+1558.5:herm(Q+1118.5,Q+1558.5,145,210,t,2.2)+Math.max(0,t-2.2)*210;
      P=Q+670;C=Q+764;pf=2;pa=.32;px=34;break;
  }
  return {H:B+H,P:B+P,C:B+C,gap:gapWorld(s.stage),
    hero:{x:270+Math.sin(s.time*.7)*2,y:ANCHOR+C-H,scale:hs,frame:hf,angle:ha,alpha,jump:jh},
    police:{x:270+px,y:ANCHOR+C-P,scale:ps,frame:pf,angle:pa,alpha:1,jump:jp},
    shake:s.phase==='collapse'?Math.sin(t*35)*(1-p)*2.3:0};
}

export function paddedHalfExtent(cell: number, scale: number, angle: number): number {
  'worklet';
  return cell/2*scale*(Math.abs(Math.cos(angle))+Math.abs(Math.sin(angle)));
}
export function spriteSeparation(w: World): number {
  'worklet';
  return (w.police.y-w.police.jump-paddedHalfExtent(POLICE_CELL,w.police.scale,w.police.angle)) -
    (w.hero.y-w.hero.jump+paddedHalfExtent(HERO_CELL,w.hero.scale,w.hero.angle));
}
export function finaleComplete(s: Simulation): boolean {
  'worklet';
  const w=worldAt(s);
  return s.stage===5 && s.outcome==='correct' && s.phase==='escape' && s.elapsed>=2.2 &&
    w.P>w.gap+89 && w.police.frame===2 &&
    w.hero.y-w.hero.jump+paddedHalfExtent(HERO_CELL,w.hero.scale,w.hero.angle)<0;
}
