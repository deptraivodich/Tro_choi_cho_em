import { fitToBoard, clampToBounds, cameraTranslation, smoothStep } from '../logic/cameraGeometry';

test.each([[640, 360], [780, 360], [800, 360], [960, 432], [1280, 720], [360, 800]])(
  'camera covers %s×%s, fits the playable board and clamps every edge', (width, height) => {
    const bounds = fitToBoard(width, height);
    expect(bounds.worldWidth * bounds.fit).toBeCloseTo(width);
    expect(bounds.worldHeight * bounds.fit).toBeCloseTo(height);
    expect(bounds.origin.x).toBeGreaterThanOrEqual(0); expect(bounds.origin.y).toBeGreaterThanOrEqual(0);
    for (const scale of [bounds.fit, bounds.zoom, bounds.fit * 1.06]) {
      for (const point of [{ x: -200, y: -200 }, { x: 4000, y: 4000 }, { x: 450, y: 280 }]) {
        const center = clampToBounds(point, scale, bounds);
        const translation = cameraTranslation(center, scale, bounds);
        const left = translation.x + (1 - scale) * bounds.worldWidth / 2;
        const top = translation.y + (1 - scale) * bounds.worldHeight / 2;
        expect(left).toBeLessThanOrEqual(.00001); expect(top).toBeLessThanOrEqual(.00001);
        expect(left + bounds.worldWidth * scale).toBeGreaterThanOrEqual(width - .00001);
        expect(top + bounds.worldHeight * scale).toBeGreaterThanOrEqual(height - .00001);
      }
    }
  });
test('smoothing is bounded, monotonic and has no jump at either end', () => {
  expect(smoothStep(-1)).toBe(0); expect(smoothStep(2)).toBe(1);
  expect(smoothStep(.5)).toBe(.5); expect(smoothStep(.001)).toBeLessThan(.00001);
  for (let i = 1; i <= 100; i++) expect(smoothStep(i / 100)).toBeGreaterThan(smoothStep((i - 1) / 100));
});
