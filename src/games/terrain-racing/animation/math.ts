export function clamp(v: number, low = 0, high = 1): number {
  'worklet';
  return Math.max(low, Math.min(high, v));
}
export function ease(p: number): number {
  'worklet';
  return p * p * (3 - 2 * p);
}
export function bell(p: number): number {
  'worklet';
  return 16 * p * p * (1 - p) * (1 - p);
}
// Ported from handoff game.js: endpoint positions AND velocities survive stage joins.
export function herm(a: number, b: number, va: number, vb: number, t: number, d: number): number {
  'worklet';
  const p = clamp(t / d);
  return (2*p*p*p - 3*p*p + 1)*a + (p*p*p - 2*p*p + p)*d*va +
    (-2*p*p*p + 3*p*p)*b + (p*p*p - p*p)*d*vb;
}
