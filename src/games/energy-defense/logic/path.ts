// Distances are logical units; speed remains the original units per 100ms.
export const PATH_LENGTH = 370;
export type MovingEnemy = { bornAt: number; speed: number };
export function travelled(enemy: MovingEnemy, now: number) {
  'worklet';
  return Math.max(0, (now - enemy.bornAt) * enemy.speed / 100);
}
export function pathPosition(distance: number) {
  'worklet';
  const d = Math.max(0, Math.min(PATH_LENGTH, distance));
  if (d <= 170) return { x: d, y: 70 };
  if (d <= 245) return { x: 170, y: 70 + d - 170 };
  return { x: 170 + d - 245, y: 145 };
}
export function pathHeading(distance: number) {
  'worklet';
  // Rounded visual heading at corners; ground anchor always follows the authoritative path.
  const smooth = (v: number) => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };
  return Math.PI / 2 * (smooth((distance - 165) / 10) - smooth((distance - 240) / 10));
}
