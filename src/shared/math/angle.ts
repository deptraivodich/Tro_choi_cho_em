export type AngleClassification = 'acute' | 'right' | 'obtuse' | 'straight';

export function classifyAngle(degrees: number): {
  type: AngleClassification;
  vietnameseName: string;
} {
  const norm = ((degrees % 360) + 360) % 360;
  if (norm > 0 && norm < 90) return { type: 'acute', vietnameseName: 'Góc nhọn' };
  if (norm === 90) return { type: 'right', vietnameseName: 'Góc vuông' };
  if (norm > 90 && norm < 180) return { type: 'obtuse', vietnameseName: 'Góc tù' };
  if (norm === 180) return { type: 'straight', vietnameseName: 'Góc bẹt' };
  return { type: 'acute', vietnameseName: 'Góc không xác định' };
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

/**
 * 2D Projectile Physics
 * Angles 0° -> 90° shoot to the right (positive vx)
 * Angles 90° -> 180° shoot to the left (negative vx)
 */
export function calculateTrajectory(
  originX: number,
  originY: number,
  angleDegrees: number,
  power: number,
  gravity = 9.8,
  groundY = 300,
  timeStep = 0.05
): TrajectoryPoint[] {
  const angleRad = (angleDegrees * Math.PI) / 180;
  // In screen coords, Y goes down, but physics Y goes up.
  // We compute in standard physics coords then map to screen Y.
  const vx = power * Math.cos(angleRad);
  const vy = power * Math.sin(angleRad);

  const points: TrajectoryPoint[] = [];
  let t = 0;
  let currentY = originY;

  while (t <= 5 && currentY <= groundY) {
    const x = originX + vx * t * 15; // scaled for canvas
    // Physics y rises then falls: deltaY = -(vy * t - 0.5 * gravity * t^2)
    const y = originY - (vy * t - 0.5 * gravity * t * t) * 15;

    points.push({ x, y, t });
    currentY = y;
    t += timeStep;

    if (y > groundY && t > 0.1) break;
  }

  return points;
}
