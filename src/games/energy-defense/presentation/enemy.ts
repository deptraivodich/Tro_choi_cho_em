import { PATH_LENGTH, pathHeading, pathPosition } from '../logic/path';
import { worldToMap, type Point } from './combat';
import { routeFacing, routePoint, PORTRAIT_DISTANCE_SCALE, PORTRAIT_PATH_LENGTH } from './route';

export const ENEMY_FOOT_PIVOT = 228 / 256;

export function enemyFacing(distance: number, portrait = false): 1 | -1 {
  'worklet';
  return routeFacing(distance/(portrait?PORTRAIT_DISTANCE_SCALE:1),portrait);
}

/** Preserve the existing path/lane coordinates independently of sprite orientation. */
export function enemyGroundPoint(distance: number, id: number, portrait = false): Point {
  'worklet';
  if (portrait || distance > 330) {
    const factor=portrait?PORTRAIT_DISTANCE_SCALE:1, end=portrait?PORTRAIT_PATH_LENGTH:PATH_LENGTH;
    const p = routePoint(distance/factor, portrait);
    const a = routePoint(Math.max(0, distance - 3)/factor, portrait), b = routePoint(Math.min(end, distance + 3)/factor, portrait);
    const join = Math.max(0,Math.min(1,(distance-330)/6));
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * (portrait ? 1 : join*join*(3-2*join));
    // All lanes converge on the actual gate / door threshold.
    const lane = (id % 3 - 1) * 9 * Math.min(1, Math.max(0, distance) / 12, Math.max(0, end - distance) / 12);
    return { x: p.x - Math.sin(angle) * lane, y: p.y + Math.cos(angle) * lane };
  }
  const p = pathPosition(distance), map = worldToMap(p.x, p.y);
  const angle = pathHeading(distance), lane = (id % 3 - 1) * 9 * Math.min(1, Math.max(0, distance) / 12, Math.max(0, PATH_LENGTH - distance) / 12);
  return { x: map.x - Math.sin(angle) * lane, y: map.y + Math.cos(angle) * lane };
}

/** A single-view upright drawing has its visible body above its foot, at every turn.
 * This is only the visual impact anchor; logical target selection is unchanged.
 */
export function enemyBodyPoint(ground: Point, sizeInWorld: number): Point {
  'worklet';
  return { x: ground.x, y: ground.y - sizeInWorld * .36 };
}
