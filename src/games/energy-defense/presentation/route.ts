import { PATH_LENGTH, pathPosition } from '../logic/path';
import { TURRET_ART, worldToMap, type Point } from './combat';

// Source pixels in the unchanged 512px citadel: threshold, landing centre, clear opening.
// The old anchor (207,430) was the bottom step, not the actual door threshold.
export const CASTLE_ART = { size: 512, door: { x: 207, y: 383 }, step: { x: 185, y: 421 }, opening: 56 } as const;
export const CASTLE_DOOR = { x: CASTLE_ART.door.x / CASTLE_ART.size, y: CASTLE_ART.door.y / CASTLE_ART.size };
// Mobile road meets the closed door face (inside the arch), rather than the
// bottom sill. This lowers the building 48 source pixels = 15.9375 world units
// over the existing road, without moving the route or the arrival deadline.
export const PORTRAIT_CASTLE_CONTACT = { x: 207 / 512, y: 335 / 512 };
function approach(door: Point, size: number): Point {
  return { x: door.x - (CASTLE_ART.door.x - CASTLE_ART.step.x) * size / 512 * 3,
    y: door.y - (CASTLE_ART.door.y - CASTLE_ART.step.y) * size / 512 * 3 };
}

// Artwork coordinates are sampled with normalized progress; movement uses its measured level length.
// Rounded bends are sampled ONCE; road artwork and entity anchors use these same samples.
const corners: Point[] = [
  { x: 115, y: 95 }, { x: 115, y: 145 }, { x: 375, y: 145 },
  { x: 375, y: 315 }, { x: 60, y: 315 }, { x: 60, y: 580 }, { x: 330, y: 580 },
];
function rounded(points: Point[]) {
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const ab = Math.hypot(b.x - a.x, b.y - a.y), bc = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(24, ab / 2, bc / 2);
    const enter = { x: b.x + (a.x - b.x) * r / ab, y: b.y + (a.y - b.y) * r / ab };
    const leave = { x: b.x + (c.x - b.x) * r / bc, y: b.y + (c.y - b.y) * r / bc };
    result.push(enter);
    for (let j = 1; j <= 12; j++) {
      const t = j / 12, u = 1 - t;
      result.push({ x: u * u * enter.x + 2 * u * t * b.x + t * t * leave.x,
        y: u * u * enter.y + 2 * u * t * b.y + t * t * leave.y });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}
export const PORTRAIT_ROUTE = rounded(corners);
const cumulative = [0];
for (let i = 1; i < PORTRAIT_ROUTE.length; i++) {
  cumulative.push(cumulative[i - 1] + Math.hypot(PORTRAIT_ROUTE[i].x - PORTRAIT_ROUTE[i - 1].x, PORTRAIT_ROUTE[i].y - PORTRAIT_ROUTE[i - 1].y));
}
export const PORTRAIT_ROAD_LENGTH = cumulative[cumulative.length - 1];
// Round 3.5B's accepted portrait distance calibration. Keep world distance per logical unit
// fixed when adding road, rather than stretching 370 units and making monsters run faster.
export const PORTRAIT_UNITS_PER_LOGICAL = 812.5282075238852 / PATH_LENGTH;
export const PORTRAIT_PATH_LENGTH = PORTRAIT_ROAD_LENGTH / PORTRAIT_UNITS_PER_LOGICAL;
export const PORTRAIT_DISTANCE_SCALE = PORTRAIT_PATH_LENGTH / PATH_LENGTH;
// Desktop retains its accepted 370-unit approach; portrait uses its measured level distance.
const desktopStart = worldToMap(pathPosition(330).x, pathPosition(330).y);
const desktopEnd = worldToMap(pathPosition(PATH_LENGTH).x, pathPosition(PATH_LENGTH).y);
const desktopControl = approach(desktopEnd, 200);
export const DESKTOP_TAIL: Point[] = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40, u = 1 - t;
  return { x: u*u*u*desktopStart.x + 3*u*u*t*(desktopStart.x+26) + 3*u*t*t*desktopControl.x + t*t*t*desktopEnd.x,
    y: u*u*u*desktopStart.y + 3*u*u*t*desktopStart.y + 3*u*t*t*desktopControl.y + t*t*t*desktopEnd.y };
});
export function routePoint(distance: number, portrait = false): Point {
  'worklet';
  if (!portrait) {
    if (distance <= 330) { const p = pathPosition(distance); return worldToMap(p.x, p.y); }
    const at = Math.min(40, distance - 330), i = Math.min(39, Math.floor(at)), t = at - i;
    const a = DESKTOP_TAIL[i], b = DESKTOP_TAIL[i+1];
    return { x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t };
  }
  const at = Math.max(0, Math.min(PATH_LENGTH, distance)) / PATH_LENGTH * PORTRAIT_ROAD_LENGTH;
  for (let i = 1; i < cumulative.length; i++) {
    if (at <= cumulative[i] || i === cumulative.length - 1) {
      const a = PORTRAIT_ROUTE[i - 1], b = PORTRAIT_ROUTE[i];
      const t = (at - cumulative[i - 1]) / (cumulative[i] - cumulative[i - 1]);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return PORTRAIT_ROUTE[0];
}
export function roadData(portrait: boolean) {
  const points = portrait ? PORTRAIT_ROUTE : [routePoint(0), routePoint(170), routePoint(245), ...DESKTOP_TAIL];
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
}
/** Portrait stays full width under the foundation; retain the accepted desktop approach. */
export function roadRibbon(portrait: boolean, inset = 0) {
  const left: Point[] = [], right: Point[] = [];
  const count = 370;
  for (let d = 0; d <= count; d++) {
    const p = routePoint(d,portrait), a = routePoint(Math.max(0,d-1),portrait), b = routePoint(Math.min(count,d+1),portrait);
    const angle = Math.atan2(b.y-a.y,b.x-a.x);
    const t = Math.max(0,Math.min(1,(count-d)/38)), smooth=t*t*(3-2*t);
    const desktopMouth=CASTLE_ART.opening*200/512;
    const width=portrait?64:desktopMouth+(64-desktopMouth)*smooth;
    const half = Math.max(2, (width-inset)/2);
    left.push({x:p.x-Math.sin(angle)*half,y:p.y+Math.cos(angle)*half});
    right.push({x:p.x+Math.sin(angle)*half,y:p.y-Math.cos(angle)*half});
  }
  return [...left,...right.reverse()].map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ')+' Z';
}
export function castlePlacement(portrait: boolean) {
  const size = portrait ? 170 : 200, door = routePoint(PATH_LENGTH, portrait);
  const anchor = portrait ? PORTRAIT_CASTLE_CONTACT : CASTLE_DOOR;
  return { left: door.x - anchor.x * size, top: door.y - anchor.y * size, width: size, height: size };
}
export function turretBasePlacement(portrait: boolean) {
  const x = portrait ? 160 : 216, y = portrait ? 420 : 254;
  return { left: x - 74, top: y + 72 - 148 * .93, width: 148, height: 148 };
}
export function turretPoint(portrait: boolean): Point {
  'worklet';
  // Keep the foundation fixed; mount the head at the real bearing in its art.
  const x = portrait ? 160 : 216, y = portrait ? 420 : 254;
  return { x: x - 74 + TURRET_ART.bearing.x*148/512,
    y: y + 72 - 148*.93 + TURRET_ART.bearing.y*148/512 };
}

/** Retain the last definite horizontal facing through vertical sections.
 * A 20-degree dead band avoids flipping on near-vertical tangent noise.
 * Pure progress lookup also gives the correct result after pause/re-mount.
 */
export function routeFacing(distance: number, portrait: boolean): 1 | -1 {
  'worklet';
  if (!portrait) return 1;
  const at = Math.max(0,Math.min(PATH_LENGTH,distance))/PATH_LENGTH*PORTRAIT_ROAD_LENGTH;
  let facing: 1 | -1 = 1;
  for (let i=1;i<PORTRAIT_ROUTE.length;i++) {
    if (at < cumulative[i-1]) break;
    const a=PORTRAIT_ROUTE[i-1], b=PORTRAIT_ROUTE[i], dx=b.x-a.x, dy=b.y-a.y;
    if (Math.abs(dx)/Math.hypot(dx,dy) > .35) facing=dx<0?-1:1;
  }
  return facing;
}
