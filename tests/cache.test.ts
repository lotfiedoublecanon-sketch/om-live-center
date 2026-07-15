import { describe, expect, it } from 'vitest';
import { StaleCache } from '../src/om/cache/stale-cache.js';

describe('StaleCache', () => {
  it('returns MISS then HIT while the value is fresh', async () => {
    const cache = new StaleCache();
    let calls = 0;
    const loader = async () => { calls += 1; return { value: 7 }; };

    const first = await cache.get('key', 1_000, loader);
    const second = await cache.get('key', 1_000, loader);

    expect(first.cache).toBe('MISS');
    expect(second.cache).toBe('HIT');
    expect(second.value.value).toBe(7);
    expect(calls).toBe(1);
  });

  it('returns the last valid value when a refresh fails', async () => {
    const cache = new StaleCache();
    await cache.get('stale', 2, async () => ['confirmed']);
    await new Promise((resolve) => setTimeout(resolve, 8));

    const result = await cache.get<string[]>('stale', 2, async () => {
      throw new Error('source offline');
    });

    expect(result.cache).toBe('STALE');
    expect(result.value).toEqual(['confirmed']);
  });
});
