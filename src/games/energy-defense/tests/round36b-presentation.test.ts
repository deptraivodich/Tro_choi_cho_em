import { enemyFacing, enemyGroundPoint } from '../presentation/enemy';
import { CASTLE_DOOR, PORTRAIT_CASTLE_CONTACT, castlePlacement, PORTRAIT_PATH_LENGTH, PORTRAIT_ROAD_LENGTH, turretBasePlacement, turretPoint } from '../presentation/route';
import { muzzleAt, TURRET_ART, TURRET_HEAD_PIVOT, TURRET_MUZZLE, TURRET_REST_ANGLE } from '../presentation/combat';

test('all mobile segments face along travel, with exactly two stable flips and upright verticals',()=>{
  const changes:number[]=[];let previous=enemyFacing(0,true);
  for(let d=.02;d<PORTRAIT_PATH_LENGTH;d+=.02){
    const facing=enemyFacing(d,true),a=enemyGroundPoint(d-.01,1,true),b=enemyGroundPoint(d+.01,1,true);
    if(Math.abs(b.x-a.x)>Math.abs(b.y-a.y)) expect(facing).toBe(b.x>a.x?1:-1);
    if(facing!==previous){changes.push(d);previous=facing;}
    expect(enemyFacing(d,true)).toBe(facing); // independent of previous frames / remount
  }
  expect(changes).toHaveLength(2);expect(changes[1]-changes[0]).toBeGreaterThan(100);
  expect(enemyFacing(300,true)).toBe(-1);expect(enemyFacing(560,true)).toBe(1);
  expect(enemyFacing(300,false)).toBe(1);
});

test.each([false,true])('real axle stays in the foundation bearing at every aim angle (%s)',portrait=>{
  const base=turretBasePlacement(portrait),hinge=turretPoint(portrait);
  expect(hinge.x).toBeCloseTo(base.left+TURRET_ART.bearing.x*base.width/512);
  expect(hinge.y).toBeCloseTo(base.top+TURRET_ART.bearing.y*base.height/512);
  for(let angle=-Math.PI;angle<=Math.PI;angle+=Math.PI/16){
    for(const recoil of [0,3,7]){
      const rotation=angle-TURRET_REST_ANGLE;
      const x=TURRET_MUZZLE.x-TURRET_HEAD_PIVOT.x-recoil*Math.cos(TURRET_REST_ANGLE);
      const y=TURRET_MUZZLE.y-TURRET_HEAD_PIVOT.y-recoil*Math.sin(TURRET_REST_ANGLE);
      const expected={x:hinge.x+x*Math.cos(rotation)-y*Math.sin(rotation),y:hinge.y+x*Math.sin(rotation)+y*Math.cos(rotation)};
      const actual=muzzleAt(angle,recoil,hinge);
      expect(actual.x).toBeCloseTo(expected.x,10);expect(actual.y).toBeCloseTo(expected.y,10);
    }
  }
});

test('mobile castle lowers over the existing road; contact stays within actual door artwork',()=>{
  const castle=castlePlacement(true),before=580-CASTLE_DOOR.y*170;
  expect(castle.top-before).toBe(15.9375);
  expect(PORTRAIT_CASTLE_CONTACT.x*512).toBe(207);expect(PORTRAIT_CASTLE_CONTACT.y*512).toBe(335);
  expect(castle.top+castle.height).toBeLessThan(640);
  expect(PORTRAIT_ROAD_LENGTH).toBeCloseTo(1284.6480556129004,10);
  expect(PORTRAIT_PATH_LENGTH).toBeCloseTo(584.9886516866561,10);
});
