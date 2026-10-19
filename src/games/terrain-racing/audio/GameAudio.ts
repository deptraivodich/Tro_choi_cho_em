import type { Phase } from '../types';

export type SoundName = 'engine' | 'siren' | 'accelerate' | 'landslide' | 'jump' | 'impact' | 'select' | 'victory' | 'loss';
export interface PlayerPort {
  loop: boolean;
  volume: number;
  playing: boolean;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  remove(): void;
}

/** Session-owned players. Never toggles the shared/global sound manager. */
export class GameAudio {
  private enabled = false;
  private suspended = false;
  private disposed = false;
  private phase: Phase = 'chase';
  private resumes = new Set<SoundName>();
  private tokens: Partial<Record<SoundName, number>> = {};
  private generation = 0;
  public error: string | null = null;
  constructor(private players: Record<SoundName, PlayerPort>) {
    players.engine.loop = true; players.siren.loop = true;
    players.engine.volume = .14; players.siren.volume = .10;
    for (const name of ['accelerate','landslide','jump','impact','select','victory','loss'] as const) {
      players[name].volume = name === 'select' ? .45 : .32;
    }
  }
  private attempt(action: () => void) {
    try { action(); } catch(error) { this.error=String(error); }
  }
  setEnabled(enabled: boolean) {
    if(this.disposed)return;
    this.enabled=enabled;
    if(!enabled){this.generation++;this.resumes.clear();this.pauseAll();}
    else this.syncLoops();
  }
  setSuspended(value: boolean) {
    if(this.disposed||value===this.suspended)return;
    this.suspended=value;
    if(value){
      this.generation++;
      for(const name of Object.keys(this.players) as SoundName[]) {
        if(this.players[name].playing)this.resumes.add(name);
      }
      this.pauseAll();
    } else if(this.enabled) {
      for(const name of this.resumes)this.attempt(()=>this.players[name].play());
      this.resumes.clear();this.syncLoops();
    }
  }
  setPhase(phase: Phase, incorrect = false) {
    if(this.disposed)return;
    if(this.phase===phase)return;
    this.phase=phase;this.syncLoops();
    const event: Partial<Record<Phase,SoundName>>={collapse:'landslide',launch:'accelerate',
      jump:'jump',policeLaunch:'accelerate',policeJump:'jump',policeRoll:'impact',result:'loss',victory:'victory'};
    if(phase==='impact'&&incorrect)this.play('impact');
    else if(event[phase])this.play(event[phase]!);
  }
  play(name: SoundName) {
    if(!this.enabled||this.suspended||this.disposed)return;
    const generation=this.generation,token=(this.tokens[name]||0)+1;
    this.tokens[name]=token;
    this.attempt(()=>{
      const player=this.players[name];
      player.pause();
      void player.seekTo(0).then(()=>{
        if(!this.disposed&&this.enabled&&!this.suspended&&this.generation===generation&&this.tokens[name]===token){
          this.attempt(()=>player.play());
        }
      }).catch(error=>{this.error=String(error);});
    });
  }
  private syncLoops() {
    const running=this.enabled&&!this.suspended&&!this.disposed&&
      !['question','settle','result','victory'].includes(this.phase);
    for(const name of ['engine','siren'] as const){
      this.attempt(()=>{
        if(running&&(name!=='siren'||this.phase!=='escape'))this.players[name].play();
        else this.players[name].pause();
      });
    }
  }
  private pauseAll(){for(const player of Object.values(this.players))this.attempt(()=>player.pause());}
  replay(){
    if(this.disposed)return;
    this.generation++;this.resumes.clear();this.suspended=false;this.phase='chase';this.pauseAll();
    for(const player of Object.values(this.players))void player.seekTo(0).catch(error=>{this.error=String(error);});
    this.syncLoops();
  }
  dispose(){
    if(this.disposed)return;
    this.disposed=true;this.generation++;this.resumes.clear();this.pauseAll();
    for(const player of Object.values(this.players))this.attempt(()=>player.remove());
  }
}
