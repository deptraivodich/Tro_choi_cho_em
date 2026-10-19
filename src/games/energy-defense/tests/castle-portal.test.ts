import { CASTLE_ART, CASTLE_DOOR, PORTRAIT_CASTLE_CONTACT, castlePlacement, roadRibbon, routePoint, PORTRAIT_PATH_LENGTH } from '../presentation/route';
import { PORTAL_ART, FRONTAL_PORTAL_ART, portalPlacement, portalPulse, portalDepth } from '../presentation/portal';
import { enemyGroundPoint } from '../presentation/enemy';
import { DefenseController } from '../logic/controller';
import { PATH_LENGTH } from '../logic/path';
import { portraitCamera } from '../presentation/portrait';

test.each([false,true])('door threshold, last movement and drawn road stay aligned (portrait=%s)', portrait => {
  const c = castlePlacement(portrait), end = routePoint(PATH_LENGTH,portrait);
  const contact=portrait?PORTRAIT_CASTLE_CONTACT:CASTLE_DOOR;
  expect(c.left+c.width*contact.x).toBeCloseTo(end.x,10);
  expect(c.top+c.height*contact.y).toBeCloseTo(end.y,10);
  const previous = routePoint(369.99,portrait), axis = {x:CASTLE_ART.door.x-CASTLE_ART.step.x,y:CASTLE_ART.door.y-CASTLE_ART.step.y};
  const a = Math.atan2(end.y-previous.y,end.x-previous.x), b = Math.atan2(axis.y,axis.x);
  if(portrait) expect(Math.abs(a)).toBeLessThan(.001);
  else expect(Math.abs(a-b)).toBeLessThan(.05);
  for (const id of [1,2,3]) expect(enemyGroundPoint(portrait?PORTRAIT_PATH_LENGTH:PATH_LENGTH,id,portrait)).toEqual(end);
  expect(roadRibbon(portrait).endsWith(' Z')).toBe(true);
  expect(roadRibbon(portrait)).not.toMatch(/NaN|Infinity/);
});

test.each([false,true])('portal floor anchor is the real spawn, with all lanes meeting it (portrait=%s)', portrait => {
  const p=portalPlacement(portrait), start=routePoint(0,portrait), art=portrait?FRONTAL_PORTAL_ART:PORTAL_ART;
  expect(p.left+p.width*art.exit.x/art.size).toBeCloseTo(start.x,10);
  expect(p.top+p.width*art.exit.y/art.size).toBeCloseTo(start.y,10);
  for(const id of [1,2,3]) expect(enemyGroundPoint(0,id,portrait)).toEqual(start);
  expect(portalDepth(0,portrait)).toBe(1); expect(portalDepth(25,portrait)).toBe(portrait?3:1);
});

test('portal only observes the gameplay clock: pulse cannot move a spawn deadline', () => {
  expect(portalPulse(1999,2000)).toBe(0);
  expect(portalPulse(2210,2000)).toBeCloseTo(1);
  expect(portalPulse(2420,2000)).toBe(0);
  expect(portalPulse(2210,2000,true)).toBe(0);
  const c=new DefenseController({random:()=>.99});c.start();c.advanceTo(1999);expect(c.getSnapshot().spawned).toBe(0);
  c.advanceTo(12000);expect(c.getSnapshot().enemies.map(e=>e.bornAt)).toEqual([2000,7000,12000]);
  expect(c.getSnapshot()).toMatchObject({wave:1,spawned:3,processed:0,hp:100});
});

test('monster survives until actual threshold and damages the base exactly once', () => {
  const c=new DefenseController({random:()=>0,spawnIntervalMs:100000});c.start();
  const arrival=2000+PATH_LENGTH/1.3*100;
  c.advanceTo(arrival-.1);expect(c.getSnapshot().hp).toBe(100);expect(c.getSnapshot().enemies).toHaveLength(1);
  c.advanceTo(arrival+.1);expect(c.getSnapshot().hp).toBe(85);expect(c.getSnapshot().enemies).toHaveLength(0);
  c.advanceTo(arrival+1000);expect(c.getSnapshot()).toMatchObject({hp:85,processed:1,kills:0});
});

test.each([[320,640],[360,640],[390,844],[412,915]])('artwork clears HUD and dock at %s x %s', (w,h) => {
  const camera=portraitCamera(w,h-197,108), portal=portalPlacement(true), castle=castlePlacement(true);
  const [x0,y0,x1,y1]=FRONTAL_PORTAL_ART.visibleBounds;
  const box={left:portal.left+x0/1536*portal.width,top:portal.top+y0/1536*portal.width,
    right:portal.left+x1/1536*portal.width,bottom:portal.top+y1/1536*portal.width};
  for(const bounds of [box,{left:castle.left,top:castle.top,right:castle.left+castle.width,bottom:castle.top+castle.height}]) {
    expect(camera.x+bounds.left*camera.scale).toBeGreaterThanOrEqual(0);
    expect(camera.x+bounds.right*camera.scale).toBeLessThanOrEqual(w);
    expect(camera.y+bounds.top*camera.scale).toBeGreaterThanOrEqual(108);
    expect(camera.y+bounds.bottom*camera.scale).toBeLessThanOrEqual(h-197);
  }
});
