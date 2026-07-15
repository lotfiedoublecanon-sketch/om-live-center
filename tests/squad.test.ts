import { afterEach, describe, expect, it, vi } from 'vitest';
import { omCache } from '../src/om/cache/stale-cache.js';
import { getOmSquad, parseOfficialSquad } from '../src/om/services/squad.js';

afterEach(() => {
  vi.unstubAllGlobals();
  omCache.clear();
});

function officialHtml(players: unknown[]): string {
  const flight = `14:[["$",{"players":${JSON.stringify(players)}}]]`;
  return `<html><body><script>self.__next_f.push([1,${JSON.stringify(flight)}])</script></body></html>`;
}

describe('official OM squad parser', () => {
  it('keeps first-team players, excludes staff and proxies the official portrait', () => {
    const players = parseOfficialSquad(officialHtml([
      {
        id: 'coach',
        name: 'Coach officiel',
        slug: 'coach-officiel',
        number: null,
        teamKey: 'men',
        position: 'Entraîneur',
        cardImage: { asset: { url: 'https://cdn.sanity.io/images/test/coach.jpg' } },
      },
      {
        id: 'keeper',
        name: 'Gardien officiel',
        slug: 'gardien-officiel',
        number: 1,
        teamKey: 'men',
        position: 'Gardien',
        cardImage: { asset: { url: 'https://cdn.sanity.io/images/test/gardien.jpg' } },
      },
    ]), '2026-07-15T12:00:00.000Z');

    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({
      id: 'gardien-officiel',
      name: 'Gardien officiel',
      number: '1',
      position: 'Gardien',
      photo: '/api/om/player-photo/gardien-officiel',
      source: 'OM.FR - Équipe première',
      updatedAt: '2026-07-15T12:00:00.000Z',
    });
  });

  it('rejects portrait hosts outside the official CDN', () => {
    const players = parseOfficialSquad(officialHtml([{
      id: 'forward',
      name: 'Attaquant officiel',
      slug: 'attaquant-officiel',
      number: null,
      teamKey: 'men',
      position: 'Attaquant',
      cardImage: { asset: { url: 'https://example.com/wrong-player.jpg' } },
    }]));

    expect(players[0]?.photo).toBeNull();
  });

  it('uses the verified local snapshot when the official source is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));
    const result = await getOmSquad();

    expect(result.fallback).toBe(true);
    expect(result.cache).toBe('MISS');
    expect(result.value).toHaveLength(29);
    expect(result.value.every((player) => player.source.includes('instantané vérifié'))).toBe(true);
  });
});
