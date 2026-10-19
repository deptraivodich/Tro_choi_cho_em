import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IStorageAdapter } from '../../../shared/storage/storageAdapter';
import type { EndlessRecord } from './controller';
const KEY = '@tro_choi_cho_em:energy-defense:endless:v1';
export class EndlessHistory {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: IStorageAdapter = AsyncStorage) {}
  async list(): Promise<EndlessRecord[]> {
    const raw = await this.storage.getItem(KEY);
    if (!raw) return [];
    try {
      const rows: unknown = JSON.parse(raw);
      if (!Array.isArray(rows)) throw new Error('Lịch sử không hợp lệ');
      return rows.filter((r): r is EndlessRecord => !!r && typeof r.id === 'string' && typeof r.playedAt === 'string'
        && Number.isFinite(r.score) && Number.isFinite(r.kills) && Number.isFinite(r.completedWave) && Number.isFinite(r.durationSeconds))
        .sort((a,b) => b.playedAt.localeCompare(a.playedAt));
    } catch { throw new Error('Không đọc được lịch sử đã lưu trên thiết bị.'); }
  }
  save(record: EndlessRecord): Promise<void> {
    const write = this.queue.catch(() => {}).then(async () => {
      const rows = await this.list();
      if (!rows.some(r => r.id === record.id)) await this.storage.setItem(KEY, JSON.stringify([record, ...rows]));
    });
    this.queue = write; return write;
  }
}
export const endlessHistory = new EndlessHistory();
