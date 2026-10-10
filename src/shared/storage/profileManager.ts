import { defaultStorage } from './localStorageAdapter';
import { IStorageAdapter } from './storageAdapter';
import { GameSessionResult, LocalUserProfile, DailyQuotaStatus } from '../types/index';

export const SCHEMA_VERSION = 1;
const STORAGE_PREFIX = '@tro_choi_cho_em:';

const KEYS = {
  PROFILE: `${STORAGE_PREFIX}profile`,
  SESSIONS: `${STORAGE_PREFIX}sessions:`,
  DAILY_QUOTA: `${STORAGE_PREFIX}daily_quota:`,
  SPACE_PETS: `${STORAGE_PREFIX}space_pets:`,
  BLOCK_ISLAND: `${STORAGE_PREFIX}block_island:`,
  FLOATING_MARKET: `${STORAGE_PREFIX}floating_market:`,
  PLANET_RESCUE_RUN: `${STORAGE_PREFIX}planet_rescue_run:`,
};

export class ProfileManager {
  private storage: IStorageAdapter;

  constructor(storage: IStorageAdapter = defaultStorage) {
    this.storage = storage;
  }

  async getOrCreateProfile(): Promise<LocalUserProfile> {
    const raw = await this.storage.getItem(KEYS.PROFILE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // ignore parse error, recreate
      }
    }

    const defaultProfile: LocalUserProfile = {
      profileId: 'local-learner-sandbox-01',
      displayName: 'Học sinh tài năng',
      avatarId: 'star_explorer',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        reducedMotion: false,
        highContrast: false,
        testMode: false,
      },
    };

    await this.storage.setItem(KEYS.PROFILE, JSON.stringify(defaultProfile));
    return defaultProfile;
  }

  async updateSettings(settings: Partial<LocalUserProfile['settings']>): Promise<LocalUserProfile> {
    const profile = await this.getOrCreateProfile();
    profile.settings = { ...profile.settings, ...settings };
    profile.lastActiveAt = new Date().toISOString();
    await this.storage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    return profile;
  }

  async saveSessionResult(result: GameSessionResult): Promise<void> {
    const key = `${KEYS.SESSIONS}${result.profileId}`;
    const raw = await this.storage.getItem(key);
    let list: GameSessionResult[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }
    list.unshift(result);
    // Keep last 100 sessions
    if (list.length > 100) list = list.slice(0, 100);
    await this.storage.setItem(key, JSON.stringify(list));
  }

  async getSessionHistory(profileId: string): Promise<GameSessionResult[]> {
    const key = `${KEYS.SESSIONS}${profileId}`;
    const raw = await this.storage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async getDailyQuota(profileId: string, dateStr: string): Promise<DailyQuotaStatus> {
    const key = `${KEYS.DAILY_QUOTA}${profileId}:${dateStr}`;
    const raw = await this.storage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback
      }
    }
    const initial: DailyQuotaStatus = {
      date: dateStr,
      vaultCodeCompleted: 0,
      islandStaminaUsed: 0,
      floatingMarketTrips: 0,
    };
    await this.storage.setItem(key, JSON.stringify(initial));
    return initial;
  }

  async updateDailyQuota(
    profileId: string,
    dateStr: string,
    updater: (prev: DailyQuotaStatus) => DailyQuotaStatus
  ): Promise<DailyQuotaStatus> {
    const current = await this.getDailyQuota(profileId, dateStr);
    const updated = updater(current);
    const key = `${KEYS.DAILY_QUOTA}${profileId}:${dateStr}`;
    await this.storage.setItem(key, JSON.stringify(updated));
    return updated;
  }

  // Generic Game State Persistence
  async getGameState<T>(gameKey: string, profileId: string, defaultValue: T): Promise<T> {
    const key = `${STORAGE_PREFIX}game_state:${gameKey}:${profileId}`;
    const raw = await this.storage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  async setGameState<T>(gameKey: string, profileId: string, state: T): Promise<void> {
    const key = `${STORAGE_PREFIX}game_state:${gameKey}:${profileId}`;
    await this.storage.setItem(key, JSON.stringify(state));
  }
}

export const profileManager = new ProfileManager();
