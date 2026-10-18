import { pathHeading, pathPosition } from '../logic/path';
import { worldToMap, type Point } from './combat';

export const ENEMY_FOOT_PIVOT = 228 / 256;

/** Preserve the existing path/lane coordinates independently of sprite orientation. */
export function enemyGroundPoint(distance: number, id: number): Point {
  'worklet';
  const p = pathPosition(distance), map = worldToMap(p.x, p.y);
  const angle = pathHeading(distance), lane = (id % 3 - 1) * 9;
  return { x: map.x - Math.sin(angle) * lane, y: map.y + Math.cos(angle) * lane };
}

/** A single-view upright drawing has its visible body above its foot, at every turn.
 * This is only the visual impact anchor; logical target selection is unchanged.
 */
export function enemyBodyPoint(ground: Point, sizeInWorld: number): Point {
  'worklet';
  return { x: ground.x, y: ground.y - sizeInWorld * .36 };
}
