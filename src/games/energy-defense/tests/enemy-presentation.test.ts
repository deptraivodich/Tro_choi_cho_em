import { enemyBodyPoint, enemyGroundPoint, ENEMY_FOOT_PIVOT } from '../presentation/enemy';
import { travelled } from '../logic/path';

test.each([1,2,3])('enemy %s retains its previous ground trajectory throughout both bends', id => {
  // Golden ground coordinates from the existing horizontal/vertical/lower segments.
  const expected = id === 1 ? [[297,134],[351,200.6],[432,269]]
    : id === 2 ? [[297,143],[342,200.6],[432,278]] : [[297,125],[360,200.6],[432,260]];
  [140,207,290].forEach((distance,i) => {
    const p=enemyGroundPoint(distance,id);
    expect(p.x).toBeCloseTo(expected[i][0]);expect(p.y).toBeCloseTo(expected[i][1]);
  });
  for (let distance = .25; distance <= 370; distance += .25) {
    const a = enemyGroundPoint(distance-.25,id), b = enemyGroundPoint(distance,id);
    expect(Math.hypot(b.x-a.x,b.y-a.y)).toBeLessThan(1);
  }
});

test.each([['scout',62,1.3],['slime',62,1],['golem',72,.7]] as const)('%s body stays above its ground anchor on horizontal, vertical and corners', (_kind,size,speed) => {
  for (const distance of [100,165,170,175,207,240,245,250,300]) {
    const now=distance/speed*100;
    expect(travelled({bornAt:0,speed},now)).toBeCloseTo(distance);
    const ground=enemyGroundPoint(distance,1), body=enemyBodyPoint(ground,size);
    expect(body.x).toBe(ground.x);
    expect(ground.y-body.y).toBeCloseTo(size*.36);
  }
  expect(ENEMY_FOOT_PIVOT*256).toBe(228);
});
