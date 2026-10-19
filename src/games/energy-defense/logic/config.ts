export type Mode = 'easy' | 'medium' | 'hard';
export const WAVE_CONFIG: Record<Mode, readonly number[]> = {
  easy: [3, 3, 3, 5, 5], medium: [2, 2, 3, 5, 7], hard: [5, 5, 5, 7, 7, 10, 10],
};
export const NORMAL_LIMIT_MS = 360_000;
export const FIRST_SPAWN_MS = 2000;
export const SPAWN_INTERVALS_MS: Record<Mode, readonly number[]> = {
  easy: [5000, 4500, 4000, 3500, 3000],
  medium: [5000, 4500, 4000, 3250, 2500],
  hard: [3500, 3250, 3000, 2750, 2500, 2250, 2000],
};
export function spawnIntervalMs(mode: Mode, wave: number, endless = false) {
  if (!Number.isSafeInteger(wave) || wave < 1) throw new Error('Invalid wave');
  if (endless) return Math.max(1000, 1900 - Math.floor((wave - 1) / 3) * 100);
  const interval = SPAWN_INTERVALS_MS[mode][wave - 1];
  if (interval === undefined) throw new Error('Invalid wave');
  return interval;
}
export function endlessEnemyCount(wave: number) {
  if (!Number.isSafeInteger(wave) || wave < 1) throw new Error('Chặng vô tận bắt đầu từ 1');
  return 10 + Math.floor((wave - 1) / 3) * 3;
}
export const ENEMY_STATS = {
  scout: { hp: 25, speed: 1.3 }, slime: { hp: 40, speed: 1.0 }, golem: { hp: 60, speed: .7 },
} as const;
