import { mkdirSync, writeFileSync } from 'node:fs';
import { DefenseController } from '../logic/controller';
import { endlessEnemyCount, spawnIntervalMs, WAVE_CONFIG, type Mode } from '../logic/config';
import type { EnergyDefenseProblem } from '../../../shared/math/generators';
import { DESKTOP_TAIL, PORTRAIT_PATH_LENGTH, PORTRAIT_ROAD_LENGTH, castlePlacement, routePoint } from '../presentation/route';

const problem = (mode: Mode): EnergyDefenseProblem => ({ id: 'pacing', difficulty: mode,
  targetDisplay: '1', targetFraction: { num: 1, den: 1 }, targetNumeric: 1,
  availablePieces: [{ id: 'one', display: '1', fraction: { num: 1, den: 1 }, numericVal: 1 }],
  explanation: '', questionType: 'decimals_warmup', validCombosCount: 1 });
const make = (mode: Mode = 'easy') => { const c = new DefenseController({ random: () => .99, problem }); c.selectMode(mode); return c; };
type Measurement = { mode: string; wave: number; count: number; intervalMs: number; firstMs: number; lastMs: number; measuredMs: number[] };
const measured: Measurement[] = [];

test.each(['easy', 'medium', 'hard'] as Mode[])('%s: measure every spawn on the real controller, across every wave', mode => {
  const c = make(mode), rows = new Map<string, Measurement>(), seen = new Set<number>();
  let key = '', waveStart = 0;
  c.subscribe(() => {
    const s = c.getSnapshot(), nextKey = `${s.endless ? 'endless' : mode}-${s.wave}`;
    if (nextKey !== key) { key = nextKey; waveStart = c.now; }
    for (const e of s.enemies) if (!seen.has(e.id)) {
      seen.add(e.id);
      if (!rows.has(key)) rows.set(key, { mode: s.endless ? 'endless' : mode, wave: s.wave, count: s.waveTotal,
        intervalMs: spawnIntervalMs(mode, s.wave, s.endless), firstMs: 2000,
        lastMs: 2000 + (s.waveTotal - 1) * spawnIntervalMs(mode, s.wave, s.endless), measuredMs: [] });
      rows.get(key)!.measuredMs.push(e.bornAt - waveStart);
    }
  });
  c.start();
  // Irregular polling deliberately straddles deadlines. Every enemy remains a golem;
  // entry overlap must never delay the fixed schedule, including 1s Endless intervals.
  let steps = 0;
  while (steps++ < 100000) {
    const s = c.getSnapshot();
    if (s.status === 'offer') c.acceptEndless(true);
    if (s.status === 'won' || (s.endless && s.wave === 32)) break;
    if (s.enemies.length && !s.shot) { c.toggle('one'); c.fire(); }
    c.advanceTo(c.now + [17, 31, 53][steps % 3]);
  }
  expect(steps).toBeLessThan(100000);
  expect([...rows.values()].filter(r => r.mode !== 'endless')).toHaveLength(WAVE_CONFIG[mode].length);
  for (const row of rows.values()) {
    expect(row.measuredMs).toEqual(Array.from({ length: row.count }, (_, i) => 2000 + i * row.intervalMs));
    if (row.mode !== 'endless' || [1,3,4,6,7,9,10,13,16,25,27,28,30,31].includes(row.wave)) measured.push(row);
  }
});

test('spawn waits 2s, pause retains deadline, exit/dispose cancel and restart starts clean', () => {
  const c = make(); c.start(); c.advanceTo(1999); expect(c.getSnapshot().spawned).toBe(0);
  c.pause(); c.advanceTo(80000); expect(c.now).toBe(1999); c.resume(); c.advanceTo(2000);
  expect(c.getSnapshot().spawned).toBe(1); c.advanceTo(6999); expect(c.getSnapshot().spawned).toBe(1);
  c.pause(); c.advanceTo(90000); c.resume(); c.advanceTo(7000); expect(c.getSnapshot().spawned).toBe(2);
  c.advanceTo(7000); expect(c.getSnapshot().spawned).toBe(2);
  c.finish('exit'); c.advanceTo(15000); expect(c.getSnapshot().spawned).toBe(2);
  c.chooseAgain(); c.start(); expect(c.getSnapshot().spawned).toBe(0);
  c.advanceTo(2000); expect(c.getSnapshot().enemies.map(e => e.id)).toEqual([1]);
  c.dispose(); c.advanceTo(20000); expect(c.getSnapshot().spawned).toBe(1);
});

test('slow living golems never gate the next scheduled spawn or complete the wave early', () => {
  const c = make('hard'); c.start(); c.advanceTo(16000);
  expect(c.getSnapshot().enemies.map(e => e.bornAt)).toEqual([2000,5500,9000,12500,16000]);
  expect(c.getSnapshot()).toMatchObject({ wave: 1, spawned: 5, processed: 0, hp: 100 });
  c.advanceTo(17000); expect(c.getSnapshot().spawned).toBe(5); expect(c.getSnapshot().enemies).toHaveLength(5);
});

test.each([28,29,30,31,1000000])('Endless wave %i clamps to integer 1000ms', wave => {
  expect(spawnIntervalMs('hard', wave, true)).toBe(1000);
  expect(endlessEnemyCount(wave)).toBe(10 + Math.floor((wave - 1) / 3) * 3);
});

test('development effect cleanup/re-attach does not leave the controller permanently disposed', () => {
  const c = make(), old = jest.fn(), current = jest.fn();
  c.subscribe(old); c.start(); c.advanceTo(1000); c.dispose(); old.mockClear();
  c.advanceTo(2000); expect(c.now).toBe(1000);
  const off = c.subscribe(current); c.advanceTo(2000);
  expect(c.getSnapshot().spawned).toBe(1); expect(current).toHaveBeenCalled(); expect(old).not.toHaveBeenCalled(); off();
});

afterAll(() => {
  const output = process.env.ENERGY_ARTIFACT_DIR || 'artifacts/energy-defense-round35';
  const desktopLength = 330*1.8 + DESKTOP_TAIL.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-DESKTOP_TAIL[i].x,p.y-DESKTOP_TAIL[i].y),0);
  mkdirSync(output, { recursive: true });
  writeFileSync(output+'/spawn-measurements.json', JSON.stringify({ platform: 'Jest real controller, injected irregular simulation clock; not wall time/native',
    geometry: { gameplayLengthBefore: 370, gameplayLengthAfter: PORTRAIT_PATH_LENGTH, desktopGameplayLength: 370, desktopRoadLength: desktopLength, portraitRoadLength: PORTRAIT_ROAD_LENGTH,
      spawn: routePoint(0,true), door: routePoint(370,true), castle: castlePlacement(true) }, rows: measured }, null, 2));
});
