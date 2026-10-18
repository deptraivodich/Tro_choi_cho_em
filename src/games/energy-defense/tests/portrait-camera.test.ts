import { MAP, muzzleAt, projectileAt, SHOT } from '../presentation/combat';
import { portraitCamera, portraitPoint, PORTRAIT } from '../presentation/portrait';
import { enemyBodyPoint, enemyGroundPoint } from '../presentation/enemy';

test('portrait projection preserves every path segment and lane distance without distorting the map', () => {
  for (const id of [1,2,3]) for (let d=0;d<370;d+=.25) {
    const a=enemyGroundPoint(d,id), b=enemyGroundPoint(d+.25,id);
    const p=portraitPoint(a), q=portraitPoint(b);
    expect(Math.hypot(q.x-p.x,q.y-p.y)).toBeCloseTo(Math.hypot(b.x-a.x,b.y-a.y),10);
  }
});

test.each([[320,640,0,0],[360,640,0,0],[360,800,0,0],[390,844,0,0],[412,915,0,0],[390,844,47,34]])('camera keeps full path, sprites and upright castle between HUD and dock at %s x %s', (w,h,top,bottom) => {
  const hud=104+top, dock=197+bottom, c=portraitCamera(w,h-dock,hud);
  const screen=(p:{x:number;y:number})=>({x:c.x+p.x*c.scale,y:c.y+p.y*c.scale});
  for(const id of [1,2,3]) for(let d=0;d<=370;d+=.5){
    const p=portraitPoint(enemyGroundPoint(d,id));
    const head=screen({x:p.x-36,y:p.y-72*228/256}),foot=screen({x:p.x+36,y:p.y+9});
    expect(head.x).toBeGreaterThanOrEqual(0);expect(foot.x).toBeLessThanOrEqual(w);
    expect(head.y).toBeGreaterThanOrEqual(hud);expect(foot.y).toBeLessThanOrEqual(h-dock);
  }
  const base=portraitPoint({x:MAP.baseX,y:MAP.baseY});
  expect(screen({x:base.x-100,y:base.y-190.6}).x).toBeGreaterThanOrEqual(0);
  expect(screen({x:base.x+100,y:base.y+9.4}).y).toBeLessThan(h-dock);
  expect(c.scale).toBeGreaterThan(0);expect(PORTRAIT.height).toBe(662);
});

test.each([0,95,170,205,245,290,369])('portrait shot at distance %s starts at the rotated cannon muzzle and hits the upright body', d => {
  const turret=portraitPoint({x:MAP.turretX,y:MAP.turretY});
  const body=enemyBodyPoint(portraitPoint(enemyGroundPoint(d,1)),72);
  const angle=Math.atan2(body.y-turret.y,body.x-turret.x),muzzle=muzzleAt(angle,0,turret);
  expect(Math.hypot(muzzle.x-turret.x,muzzle.y-turret.y)).toBeCloseTo(MAP.muzzleRadius);
  expect(projectileAt(SHOT.charge,muzzle,body)).toEqual(muzzle);
  const hit=projectileAt(SHOT.impact,muzzle,body);
  expect(hit.x).toBeCloseTo(body.x,10);expect(hit.y).toBeCloseTo(body.y,10);
});
