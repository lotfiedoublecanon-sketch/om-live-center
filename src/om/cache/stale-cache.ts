import type { CacheResult } from '../types/om.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  updatedAt: string;
}

export class StaleCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<CacheResult<unknown>>>();

  async get<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<CacheResult<T>> {
    const now = Date.now();
    const existing = this.entries.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > now) {
      return { value: existing.value, cache: 'HIT', updatedAt: existing.updatedAt };
    }

    const inFlight = this.pending.get(key) as Promise<CacheResult<T>> | undefined;
    if (inFlight) return inFlight;

    const request = (async (): Promise<CacheResult<T>> => {
      try {
        const value = await loader();
        const updatedAt = new Date().toISOString();
        this.entries.set(key, { value, expiresAt: Date.now() + ttlMs, updatedAt });
        return { value, cache: 'MISS', updatedAt };
      } catch (error) {
        if (existing) {
          return { value: existing.value, cache: 'STALE', updatedAt: existing.updatedAt };
        }
        throw error;
      } finally {
        this.pending.delete(key);
      }
    })();

    this.pending.set(key, request as Promise<CacheResult<unknown>>);
    return request;
  }

  clear(): void {
    this.entries.clear();
    this.pending.clear();
  }
}

export const omCache = new StaleCache();
