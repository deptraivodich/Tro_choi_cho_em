// Presentation coordinates only. The gameplay path, timers and rewards stay in the screen.
// Measured source-pixel anchors in the unchanged 512px artwork. The axle is
// below/left of image centre; the barrel itself points slightly upwards.
export const TURRET_ART = { sourceSize: 512, headSize: 164, baseSize: 148,
  axle: { x: 235, y: 280 }, muzzle: { x: 445, y: 249 }, bearing: { x: 225, y: 160 } } as const;
export const TURRET_REST_ANGLE = Math.atan2(TURRET_ART.muzzle.y-TURRET_ART.axle.y, TURRET_ART.muzzle.x-TURRET_ART.axle.x);
export const TURRET_HEAD_PIVOT = { x: TURRET_ART.axle.x*164/512, y: TURRET_ART.axle.y*164/512 };
export const TURRET_MUZZLE = { x: TURRET_ART.muzzle.x*164/512, y: TURRET_ART.muzzle.y*164/512 };
export const MAP = { width: 700, height: 440, turretX: 216, turretY: 254,
  muzzleRadius: Math.hypot(210,31)*164/512, baseX: 603, baseY: 326 } as const;
export const SHOT = { charge: 140, impact: 310, defeat: 390, end: 600 } as const;
export type ShotTarget = { id: number; x: number; y: number; distance?: number };
export type Point = { x: number; y: number };

export function worldToMap(x: number, y: number): Point {
  'worklet';
  return { x: 45 + x * 1.8, y: 8 + y * 1.8 };
}
export function clamp01(value: number) {
  'worklet';
  return Math.max(0, Math.min(1, value));
}
export function turretPhase(elapsed: number, firing: boolean) {
  'worklet';
  if (!firing || elapsed >= SHOT.end) return 'IDLE';
  if (elapsed < SHOT.charge) return 'CHARGING';
  if (elapsed < SHOT.defeat) return 'FIRING';
  return 'RECOVERY';
}
export function recoilAt(elapsed: number, reduced: boolean) {
  'worklet';
  return !reduced && elapsed >= SHOT.charge && elapsed < SHOT.charge + 110 ? Math.sin((elapsed - SHOT.charge) / 110 * Math.PI) * 7 : 0;
}
export function muzzleAt(angle: number, recoil = 0, origin: Point = { x: MAP.turretX, y: MAP.turretY }): Point {
  'worklet';
  return { x: origin.x + Math.cos(angle) * (MAP.muzzleRadius - recoil), y: origin.y + Math.sin(angle) * (MAP.muzzleRadius - recoil) };
}
export function projectileAt(elapsed: number, origin: Point, target: Point): Point {
  'worklet';
  const t = clamp01((elapsed - SHOT.charge) / (SHOT.impact - SHOT.charge));
  return { x: origin.x + (target.x - origin.x) * t, y: origin.y + (target.y - origin.y) * t };
}
export function walkFrame(distance: number, stride: number) {
  'worklet';
  return Math.floor(Math.max(0, distance) / stride) % 4;
}
