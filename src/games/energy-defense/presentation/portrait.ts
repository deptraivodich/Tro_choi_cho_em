import { MAP, type Point } from './combat';

// A rigid 90-degree rotation of map anchors, followed by ONE uniform camera scale.
// Artwork stays upright. Logical path, lanes, distances and simulation are unchanged.
export const PORTRAIT = { width: 440, height: 662, minY: -22, maxY: 640 } as const;
export function portraitPoint(p: Point): Point {
  'worklet';
  return { x: MAP.height - p.y, y: p.x };
}
export function scenePoint(p: Point, portrait = false): Point {
  'worklet';
  return portrait ? portraitPoint(p) : p;
}
export function portraitCamera(width: number, height: number, top: number) {
  const available = Math.max(1, height - top - 8);
  const scale = Math.min(Math.max(1, width - 12) / PORTRAIT.width, available / PORTRAIT.height);
  return { scale, x: (width - PORTRAIT.width * scale) / 2,
    y: top + (available - PORTRAIT.height * scale) / 2 - PORTRAIT.minY * scale };
}
