// One uniform camera scale; HUD/dock remain in screen space.
export const PORTRAIT = { width: 440, height: 662, minY: -22, maxY: 640 } as const;
export function portraitCamera(width: number, height: number, top: number) {
  const available = Math.max(1, height - top - 8);
  const scale = Math.min(Math.max(1, width - 12) / PORTRAIT.width, available / PORTRAIT.height);
  return { scale, x: (width - PORTRAIT.width * scale) / 2,
    y: top + (available - PORTRAIT.height * scale) / 2 - PORTRAIT.minY * scale };
}
