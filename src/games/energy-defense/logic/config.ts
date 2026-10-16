export type Mode = 'easy' | 'medium' | 'hard';
export const WAVE_CONFIG: Record<Mode, readonly number[]> = {
  easy: [3, 3, 3, 5, 5], medium: [2, 2, 3, 5, 7], hard: [5, 5, 5, 7, 7, 10, 10],
};
export const NORMAL_LIMIT_MS = 360_000;
export const SPAWN_INTERVAL_MS = 1800;
export const MIN_ENTRY_DISTANCE = 32;
export const INTER_WAVE_MS = 900;
export function endlessEnemyCount(wave: number) {
  if (!Number.isSafeInteger(wave) || wave < 1) throw new Error('Chặng vô tận bắt đầu từ 1');
  return 10 + Math.floor((wave - 1) / 3) * 3;
}
export const ENEMY_STATS = {
  scout: { hp: 25, speed: 1.3 }, slime: { hp: 40, speed: 1.0 }, golem: { hp: 60, speed: .7 },
} as const;
