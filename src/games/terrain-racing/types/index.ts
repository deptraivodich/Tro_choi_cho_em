export type Phase = 'chase' | 'collapse' | 'question' | 'launch' | 'jump' | 'impact' |
  'heroRun' | 'policeLaunch' | 'policeJump' | 'transition' | 'policeRoll' | 'escape' |
  'settle' | 'result' | 'victory';
export type Outcome = 'correct' | 'low' | 'high';
export interface SpeedQuestion {
  stage: number;
  distance: number;
  time: number;
  correct_speed: number;
  sample_choices: number[];
}
export interface Simulation {
  session: number;
  revision: number;
  phase: Phase;
  stage: number;
  elapsed: number;
  time: number;
  speed: number;
  target: number;
  outcome: Outcome;
  paused: boolean;
  completed: number;
}
export interface CarPose {
  x: number;
  y: number;
  scale: number;
  frame: number;
  angle: number;
  alpha: number;
  jump: number;
}
export interface World {
  H: number;
  P: number;
  C: number;
  gap: number;
  hero: CarPose;
  police: CarPose;
  shake: number;
}
