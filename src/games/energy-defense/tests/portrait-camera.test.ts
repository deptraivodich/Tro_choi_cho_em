import { MAP, muzzleAt, projectileAt, SHOT } from '../presentation/combat';
import { portraitCamera, PORTRAIT } from '../presentation/portrait';
import { castlePlacement, routePoint, roadData, PORTRAIT_ROUTE, PORTRAIT_ROAD_LENGTH, PORTRAIT_PATH_LENGTH, turretPoint } from '../presentation/route';
import { enemyBodyPoint, enemyGroundPoint } from '../presentation/enemy';

test('portrait road and movement share every sampled bend, spawn and door', () => {
  expect(roadData(true)).toBe(PORTRAIT_ROUTE.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' '));
  expect(routePoint(0,true)).toEqual({x:115,y:95});
  expect(routePoint(370,true)).toEqual({x:330,y:580});
  for(const id of [1,2,3]) {
    expect(enemyGroundPoint(0,id,true)).toEqual(routePoint(0,true));
    expect(enemyGroundPoint(PORTRAIT_PATH_LENGTH,id,true)).toEqual(routePoint(370,true));
    for(let d=.25;d<=PORTRAIT_PATH_LENGTH;d+=.25){
      const a=enemyGroundPoint(d-.25,id,true),b=enemyGroundPoint(d,id,true);
      expect(Math.hypot(b.x-a.x,b.y-a.y)).toBeLessThan(.25*PORTRAIT_ROAD_LENGTH/370*1.7);
    }
  }
});

test.each([[320,640,0,0],[360,640,0,0],[360,800,0,0],[390,844,0,0],[412,915,0,0],[390,844,47,34]])('camera keeps full path, sprites and upright castle between HUD and dock at %s x %s', (w,h,top,bottom) => {
  const hud=104+top, dock=197+bottom, c=portraitCamera(w,h-dock,hud);
  const screen=(p:{x:number;y:number})=>({x:c.x+p.x*c.scale,y:c.y+p.y*c.scale});
  for(const id of [1,2,3]) for(let d=0;d<=PORTRAIT_PATH_LENGTH;d+=.5){
    const p=enemyGroundPoint(d,id,true);
    const head=screen({x:p.x-36,y:p.y-72*228/256}),foot=screen({x:p.x+36,y:p.y+9});
    expect(head.x).toBeGreaterThanOrEqual(0);expect(foot.x).toBeLessThanOrEqual(w);
    expect(head.y).toBeGreaterThanOrEqual(hud);expect(foot.y).toBeLessThanOrEqual(h-dock);
  }
  const base=castlePlacement(true);
  expect(screen({x:base.left,y:base.top}).x).toBeGreaterThanOrEqual(0);
  expect(screen({x:base.left+base.width,y:base.top+base.height}).y).toBeLessThan(h-dock);
  expect(c.scale).toBeGreaterThan(0);expect(PORTRAIT.height).toBe(662);
});

test.each([0,95,170,205,245,290,369])('portrait shot at distance %s starts at the cannon muzzle and hits the upright body', d => {
  const turret=turretPoint(true);
  const body=enemyBodyPoint(enemyGroundPoint(d,1,true),72);
  const angle=Math.atan2(body.y-turret.y,body.x-turret.x),muzzle=muzzleAt(angle,0,turret);
  expect(Math.hypot(muzzle.x-turret.x,muzzle.y-turret.y)).toBeCloseTo(MAP.muzzleRadius);
  expect(projectileAt(SHOT.charge,muzzle,body)).toEqual(muzzle);
  const hit=projectileAt(SHOT.impact,muzzle,body);
  expect(hit.x).toBeCloseTo(body.x,10);expect(hit.y).toBeCloseTo(body.y,10);
});
