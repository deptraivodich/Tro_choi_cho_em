// Visual gait shares movement progress, with no second timer or repeating callback.
// Ring/camera follow the ground point, so camera tracking cannot cancel the bob.
export function tokenGait(progress: number, size: number, moving: boolean, shortcut: boolean, reduced: boolean) {
  'worklet';
  if (!moving || reduced || progress <= 0 || progress >= 1) return { lift: 0, tilt: 0, squash: 1 };
  const cycles = shortcut ? 3 : 1;
  const step = Math.sin(Math.PI * progress * cycles);
  const envelope = Math.sin(Math.PI * progress);
  return { lift: -Math.abs(step) * size * .105,
    tilt: Math.sin(2 * Math.PI * progress * cycles) * envelope * 3.5,
    squash: 1 + Math.abs(step) * .035 };
}
