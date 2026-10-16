import { generateEnergyDefenseProblem, type EnergyDefenseProblem } from '../../../shared/math/generators';
import { addFractions, areFractionsEqual, type Fraction } from '../../../shared/math/fraction';
import { ENEMY_STATS, endlessEnemyCount, INTER_WAVE_MS, MIN_ENTRY_DISTANCE, NORMAL_LIMIT_MS, SPAWN_INTERVAL_MS, WAVE_CONFIG, type Mode } from './config';
import { PATH_LENGTH, travelled } from './path';
export type Enemy = { id: number; type: keyof typeof ENEMY_STATS; bornAt: number; speed: number; hp: number; maxHp: number; x: number; y: number };
export type Shot = { id: number; targetId: number | null; startAt: number; endAt: number };
export type EndReason = 'defeat' | 'timeout' | 'exit' | 'victory';
export type EndlessRecord = { id: string; playedAt: string; score: number; kills: number; completedWave: number; durationSeconds: number; reason: EndReason };
export type BattleState = {
  runId: string; status: 'select' | 'running' | 'offer' | 'won' | 'lost' | 'exited'; paused: boolean; mode: Mode; endless: boolean;
  wave: number; waveTotal: number; spawned: number; processed: number; enemies: Enemy[]; shot: Shot | null;
  hp: number; score: number; correct: number; incorrect: number; kills: number; endlessScore: number; endlessKills: number; endlessCompleted: number;
  elapsedSeconds: number; endlessSeconds: number; problem: EnergyDefenseProblem; selected: string[]; feedback: string | null; success: boolean; reason: EndReason | null;
};
type Options = { random?: () => number; problem?: (mode: Mode, count: number) => EnergyDefenseProblem; spawnIntervalMs?: number };
export class DefenseController {
  private listeners = new Set<() => void>();
  private state: BattleState;
  private clock = 0;
  private nextSpawn = 0;
  private nextEnemy = 0;
  private nextShot = 0;
  private questions = 0;
  private endlessStart = 0;
  private endedRecord: EndlessRecord | null = null;
  private random: () => number;
  private makeProblem: (mode: Mode, count: number) => EnergyDefenseProblem;
  private spawnInterval: number;
  constructor(options: Options = {}) {
    this.random = options.random ?? Math.random;
    this.makeProblem = options.problem ?? ((mode) => generateEnergyDefenseProblem(mode));
    this.spawnInterval = options.spawnIntervalMs ?? SPAWN_INTERVAL_MS;
    this.state = this.initial('easy');
  }
  private initial(mode: Mode): BattleState {
    return { runId: '', status: 'select', paused: false, mode, endless: false, wave: 1, waveTotal: WAVE_CONFIG[mode][0],
      spawned: 0, processed: 0, enemies: [], shot: null, hp: 100, score: 0, correct: 0, incorrect: 0, kills: 0,
      endlessScore: 0, endlessKills: 0, endlessCompleted: 0, elapsedSeconds: 0, endlessSeconds: 0,
      problem: this.makeProblem(mode, 0), selected: [], feedback: null, success: false, reason: null };
  }
  get now() { return this.clock; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<BattleState>) {
    this.state = { ...this.state, ...patch }; this.listeners.forEach(l => l());
  }
  selectMode(mode: Mode) {
    if (this.state.status !== 'select') return false;
    this.publish({ mode, waveTotal: WAVE_CONFIG[mode][0], problem: this.makeProblem(mode, 0) }); return true;
  }
  start() {
    if (this.state.status !== 'select') return false;
    this.clock = 0; this.questions = 0; this.nextEnemy = 0; this.nextShot = 0; this.nextSpawn = 0; this.endedRecord = null;
    this.state = { ...this.initial(this.state.mode), runId: 'ed-' + Date.now() + '-' + Math.random().toString(36).slice(2), status: 'running' };
    this.spawn(); this.publish({}); return true;
  }
  pause() { if (this.state.status === 'running') this.publish({ paused: true }); }
  resume() { if (this.state.status === 'running') this.publish({ paused: false }); }
  chooseAgain() {
    if (this.state.status === 'running' || this.state.status === 'offer') this.finish('exit');
    this.clock = 0; this.publish(this.initial(this.state.mode));
  }
  private spawn() {
    const s = this.state;
    if (s.spawned >= s.waveTotal) return;
    const type = (['scout', 'slime', 'golem'] as const)[Math.min(2, Math.floor(this.random() * 3))];
    const stats = ENEMY_STATS[type];
    const enemy: Enemy = { id: ++this.nextEnemy, type, bornAt: this.clock, speed: stats.speed, hp: stats.hp, maxHp: stats.hp, x: 0, y: 70 };
    this.nextSpawn = this.clock + this.spawnInterval;
    this.publish({ spawned: s.spawned + 1, enemies: [...s.enemies, enemy] });
  }
  toggle(id: string) {
    if (this.state.status !== 'running' || this.state.paused || this.state.shot || !this.state.problem.availablePieces.some(p => p.id === id)) return;
    const selected = this.state.selected;
    this.publish({ selected: selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id], feedback: null });
  }
  selectedSum(): Fraction {
    return this.state.problem.availablePieces.filter(p => this.state.selected.includes(p.id)).reduce((sum, p) => addFractions(sum, p.fraction), { num: 0, den: 1 });
  }
  fire() {
    const s = this.state;
    if (s.status !== 'running' || s.paused || s.shot || !s.selected.length) return false;
    if (!areFractionsEqual(this.selectedSum(), s.problem.targetFraction)) {
      this.publish({ incorrect: s.incorrect + 1, success: false, feedback: 'Chưa đúng mục tiêu. Em hãy kiểm tra phép cộng và chọn lại pha lê.' }); return false;
    }
    const target = [...s.enemies].sort((a,b) => travelled(b,this.clock) - travelled(a,this.clock))[0];
    const shot: Shot = { id: ++this.nextShot, targetId: target?.id ?? null, startAt: this.clock, endAt: this.clock + (target ? 600 : 800) };
    this.publish({ shot, score: s.score + (s.endless ? 0 : 25), correct: s.correct + 1, success: true, feedback: 'Chính xác! Pháo đã nạp đủ năng lượng.' }); return true;
  }
  advanceTo(now: number) {
    if (!Number.isFinite(now) || now <= this.clock || this.state.status !== 'running' || this.state.paused) return;
    // Bounded chronological substeps give the same spawn/collision outcomes at different refresh rates.
    while (this.clock < now && this.state.status === 'running' && !this.state.paused) {
      this.clock = Math.min(now, this.clock + 20);
      this.tick();
    }
    const elapsedSeconds = Math.floor(this.clock / 1000), endlessSeconds = this.state.endless ? Math.floor((this.clock - this.endlessStart) / 1000) : 0;
    if (elapsedSeconds !== this.state.elapsedSeconds || endlessSeconds !== this.state.endlessSeconds) this.publish({ elapsedSeconds, endlessSeconds });
  }
  private tick() {
    let s = this.state;
    if (!s.endless && this.clock >= NORMAL_LIMIT_MS) { this.finish('timeout'); return; }
    const shot = s.shot;
    // Once impact has happened the target stays at its hit location through its death animation.
    const escaped = s.enemies.filter(e => travelled(e, shot?.targetId === e.id ? Math.min(this.clock, shot.startAt + 310) : this.clock) >= PATH_LENGTH);
    if (escaped.length) {
      const ids = new Set(escaped.map(e => e.id));
      const hp = Math.max(0, s.hp - 15 * escaped.length);
      this.publish({ hp, enemies: s.enemies.filter(e => !ids.has(e.id)), processed: s.processed + escaped.length });
      if (!hp) { this.finish('defeat'); return; }
    }
    s = this.state;
    if (s.shot && this.clock >= s.shot.endAt) {
      const killed = s.enemies.some(e => e.id === s.shot?.targetId);
      const targetId = s.shot.targetId;
      this.questions++;
      this.publish({ enemies: s.enemies.filter(e => e.id !== targetId), processed: s.processed + (killed ? 1 : 0),
        kills: s.kills + (killed ? 1 : 0), endlessKills: s.endlessKills + (s.endless && killed ? 1 : 0),
        endlessScore: s.endlessScore + (s.endless && killed ? 10 : 0),
        shot: null, selected: [], problem: this.makeProblem(s.mode, this.questions), feedback: null });
    }
    s = this.state;
    if (s.spawned < s.waveTotal && this.clock >= this.nextSpawn) {
      const entryClear = s.enemies.every(e => travelled(e, this.clock) >= MIN_ENTRY_DISTANCE);
      if (entryClear) this.spawn();
    }
    s = this.state;
    if (s.spawned === s.waveTotal && s.processed === s.waveTotal && !s.enemies.length && !s.shot && s.hp > 0) {
      if (s.endless) {
        this.publish({ endlessCompleted: s.wave, wave: s.wave + 1, waveTotal: endlessEnemyCount(s.wave + 1), spawned: 0, processed: 0 });
        this.nextSpawn = this.clock + INTER_WAVE_MS;
      } else if (s.wave < WAVE_CONFIG[s.mode].length) {
        this.publish({ wave: s.wave + 1, waveTotal: WAVE_CONFIG[s.mode][s.wave], spawned: 0, processed: 0 });
        this.nextSpawn = this.clock + INTER_WAVE_MS;
      } else if (s.mode === 'hard') this.publish({ status: 'offer' });
      else this.finish('victory');
    }
  }
  acceptEndless(yes: boolean) {
    if (this.state.status !== 'offer') return;
    if (!yes) { this.finish('victory'); return; }
    this.endlessStart = this.clock;
    this.nextSpawn = this.clock;
    this.publish({ endless: true, status: 'running', paused: false, wave: 1, waveTotal: endlessEnemyCount(1), spawned: 0, processed: 0,
      endlessScore: 0, endlessKills: 0, endlessCompleted: 0, endlessSeconds: 0, selected: [], feedback: null, problem: this.makeProblem('hard', ++this.questions) });
    this.spawn();
  }
  finish(reason: EndReason) {
    if (!['running','offer'].includes(this.state.status)) return;
    const s = this.state;
    if (s.endless && !this.endedRecord) this.endedRecord = { id: s.runId + '-endless', playedAt: new Date().toISOString(), score: s.endlessScore,
      kills: s.endlessKills, completedWave: s.endlessCompleted, durationSeconds: Math.floor((this.clock - this.endlessStart) / 1000), reason };
    this.publish({ status: reason === 'victory' ? 'won' : reason === 'exit' ? 'exited' : 'lost', reason, shot: null, paused: false });
  }
  getEndlessRecord() { return this.endedRecord; }
  dispose() { this.listeners.clear(); }
}
