import { MAP, muzzleAt, projectileAt, recoilAt, SHOT, turretPhase, walkFrame, worldToMap } from '../presentation/combat';

test('presentation maps the unchanged logical path into the battlefield consistently', () => {
  expect(worldToMap(0, 70)).toEqual({ x: 45, y: 134 });
  expect(worldToMap(170, 70)).toEqual({ x: 351, y: 134 });
  expect(worldToMap(170, 145)).toEqual({ x: 351, y: 269 });
  expect(worldToMap(310, 145)).toEqual({ x: 603, y: 269 });
});

test('turret presentation completes within the existing 600ms answer callback', () => {
  expect(turretPhase(0, true)).toBe('CHARGING');
  expect(turretPhase(SHOT.charge - 1, true)).toBe('CHARGING');
  expect(turretPhase(SHOT.charge, true)).toBe('FIRING');
  expect(turretPhase(SHOT.defeat, true)).toBe('RECOVERY');
  expect(turretPhase(SHOT.end, true)).toBe('IDLE');
  expect(turretPhase(100, false)).toBe('IDLE');
});

test('projectile starts at the muzzle, visits intermediate positions and ends at the target', () => {
  const from = { x: 216, y: 254 }, target = { x: 120, y: 104 };
  expect(projectileAt(0, from, target)).toEqual(from);
  expect(projectileAt(SHOT.charge, from, target)).toEqual(from);
  expect(projectileAt((SHOT.charge + SHOT.impact) / 2, from, target)).toEqual({ x: 168, y: 179 });
  expect(projectileAt(SHOT.impact, from, target)).toEqual(target);
  expect(projectileAt(2000, from, target)).toEqual(target);
});

test.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('muzzle respects cannon direction and recoil at angle %s', angle => {
  const kick = recoilAt(195, false), muzzle = muzzleAt(angle, kick);
  expect(Math.hypot(muzzle.x - MAP.turretX, muzzle.y - MAP.turretY)).toBeCloseTo(MAP.muzzleRadius - kick);
  expect(Math.atan2(muzzle.y - MAP.turretY, muzzle.x - MAP.turretX)).toBeCloseTo(angle);
});

test('recoil returns to neutral and reduced motion does not alter the shot deadline', () => {
  expect(recoilAt(0, false)).toBe(0);
  expect(recoilAt(195, false)).toBeCloseTo(7);
  expect(recoilAt(250, false)).toBe(0);
  expect(recoilAt(195, true)).toBe(0);
  expect(SHOT.end).toBe(600);
});

test('walk cycle is driven by travelled distance, not React render count or wall time', () => {
  expect([0, 2.5, 5, 7.5, 10].map(distance => walkFrame(distance, 2.5))).toEqual([0, 1, 2, 3, 0]);
  expect(walkFrame(5, 2.5)).toBe(walkFrame(5, 2.5));
});
