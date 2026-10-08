import AsyncStorage from '@react-native-async-storage/async-storage';
import { IStorageAdapter } from './storageAdapter';

class LocalStorageAdapter implements IStorageAdapter {
  private inMemoryFallback: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) return value;
      }
    } catch {
      // Fallback to in-memory
    }
    return this.inMemoryFallback.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(key, value);
      }
    } catch {
      // Fallback
    }
    this.inMemoryFallback.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Fallback
    }
    this.inMemoryFallback.delete(key);
  }

  async clear(): Promise<void> {
    try {
      if (AsyncStorage && typeof AsyncStorage.clear === 'function') {
        await AsyncStorage.clear();
      }
    } catch {
      // Fallback
    }
    this.inMemoryFallback.clear();
  }
}

export const defaultStorage = new LocalStorageAdapter();
