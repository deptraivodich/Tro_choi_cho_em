export interface Point { x: number; y: number }
export interface CameraBounds { width: number; height: number; worldWidth: number; worldHeight: number; origin: Point; fit: number; zoom: number }

// The graph keeps its original 1024 × 576 coordinates. Only the painted dice footer is cropped.
export function fitToBoard(width: number, height: number): CameraBounds {
  const w = Math.max(1, width), h = Math.max(1, height);
  const worldWidth = Math.max(1024, 460.8 * w / h);
  const worldHeight = Math.max(460.8, 1024 * h / w);
  const fit = w / worldWidth;
  return { width: w, height: h, worldWidth, worldHeight,
    origin: { x: (worldWidth - 1024) / 2, y: (worldHeight - 460.8) / 2 },
    // About 9.5% less magnification on landscape phones; every focus/follow mode shares this target.
    fit, zoom: Math.max(fit, Math.min(1.6, h / 315)) };
}
export function clampToBounds(point: Point, scale: number, bounds: CameraBounds): Point {
  'worklet';
  const halfW = bounds.width / (2 * scale), halfH = bounds.height / (2 * scale);
  return { x: Math.max(halfW, Math.min(bounds.worldWidth - halfW, point.x)),
    y: Math.max(halfH, Math.min(bounds.worldHeight - halfH, point.y)) };
}
export function cameraTranslation(point: Point, scale: number, bounds: CameraBounds): Point {
  'worklet';
  // RN scales around the view centre. Compensate so all world layers share one transform.
  return { x: bounds.width / 2 - point.x * scale - (1 - scale) * bounds.worldWidth / 2,
    y: bounds.height / 2 - point.y * scale - (1 - scale) * bounds.worldHeight / 2 };
}
export function smoothStep(progress: number): number {
  'worklet';
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
}
