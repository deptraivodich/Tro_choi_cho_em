import { mkdirSync, writeFileSync } from 'node:fs';
import { DefenseController } from '../logic/controller';
import { ENEMY_STATS } from '../logic/config';
import { PATH_LENGTH, travelled } from '../logic/path';
import { enemyGroundPoint } from '../presentation/enemy';
import { PORTRAIT_PATH_LENGTH, PORTRAIT_ROAD_LENGTH, PORTRAIT_UNITS_PER_LOGICAL, routePoint } from '../presentation/route';

const measurements: object[]=[];
test('added road adds travel distance instead of increasing world velocity',()=>{
  const a=enemyGroundPoint(1,1,true),b=enemyGroundPoint(6,1,true);
  expect(Math.hypot(b.x-a.x,b.y-a.y)/5).toBeCloseTo(PORTRAIT_UNITS_PER_LOGICAL,8);
  expect(PORTRAIT_PATH_LENGTH*PORTRAIT_UNITS_PER_LOGICAL).toBeCloseTo(PORTRAIT_ROAD_LENGTH,8);
  expect(enemyGroundPoint(PORTRAIT_PATH_LENGTH,1,true)).toEqual(routePoint(PATH_LENGTH,true));
  expect(ENEMY_STATS.scout.speed).toBe(1.3);expect(ENEMY_STATS.slime.speed).toBe(1);expect(ENEMY_STATS.golem.speed).toBe(.7);
});

test.each([0,.4,.99])('measured portrait distance reaches the actual door once (kind=%s)',random=>{
  const c=new DefenseController({pathLength:PORTRAIT_PATH_LENGTH,random:()=>random,spawnIntervalMs:1_000_000});
  c.start();c.advanceTo(2000);const enemy=c.getSnapshot().enemies[0];
  const expected=2000+PORTRAIT_PATH_LENGTH/enemy.speed*100;
  c.advanceTo(expected-.01);expect(c.getSnapshot().hp).toBe(100);
  const d=travelled(enemy,c.now);const foot=enemyGroundPoint(d,enemy.id,true),door=routePoint(PATH_LENGTH,true);
  expect(Math.hypot(foot.x-door.x,foot.y-door.y)).toBeLessThan(.01);
  c.advanceTo(expected+.01);expect(c.getSnapshot()).toMatchObject({hp:85,processed:1});expect(c.getSnapshot().enemies).toHaveLength(0);
  c.advanceTo(expected+1000);expect(c.getSnapshot()).toMatchObject({hp:85,processed:1});
  measurements.push({type:enemy.type,speed:enemy.speed,beforeSeconds:PATH_LENGTH/enemy.speed/10,afterSeconds:PORTRAIT_PATH_LENGTH/enemy.speed/10,measuredEscapeMs:expected+.01,expectedEscapeMs:expected});
});

test('level distance is frozen through pause/resume and can change only for a new run',()=>{
  const c=new DefenseController({pathLength:PORTRAIT_PATH_LENGTH});c.start();c.advanceTo(4000);
  expect(c.setPathLength(370)).toBe(false);c.pause();c.advanceTo(99999);expect(c.now).toBe(4000);
  c.resume();expect(c.pathLength).toBe(PORTRAIT_PATH_LENGTH);c.chooseAgain();
  expect(c.setPathLength(370)).toBe(true);expect(c.setPathLength(NaN)).toBe(false);
  c.start();expect(c.pathLength).toBe(370);c.advanceTo(2000);expect(c.getSnapshot().spawned).toBe(1);
});

afterAll(()=>{const out=process.env.ENERGY_ARTIFACT_DIR||'artifacts/energy-defense-round36';mkdirSync(out,{recursive:true});
  writeFileSync(out+'/journey-measurements.json',JSON.stringify({platform:'Jest actual controller with injected game clock; not native wall time',beforeLogicalLength:370,afterLogicalLength:PORTRAIT_PATH_LENGTH,worldUnitsPerLogical:PORTRAIT_UNITS_PER_LOGICAL,presentationLength:PORTRAIT_ROAD_LENGTH,measurements},null,2));});
