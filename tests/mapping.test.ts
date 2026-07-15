import { describe, expect, it } from 'vitest';
import { mapEspnEvent } from '../src/om/adapters/live.js';
import { transferStatus } from '../src/om/adapters/transfers.js';
import { parseRss, type NormalizedRssItem } from '../src/om/services/rss.js';

const rssItem = (overrides: Partial<NormalizedRssItem>): NormalizedRssItem => ({
  title: 'Information mercato OM',
  url: 'https://news.google.com/item',
  publishedAt: '2026-07-15T12:00:00.000Z',
  source: 'Source',
  ...overrides,
});

describe('mercato classification', () => {
  it('allows OFFICIEL only for an official publisher with confirmed wording', () => {
    expect(transferStatus(rssItem({
      title: 'Communique : le joueur signe a Marseille',
      source: 'Olympique de Marseille',
      sourceUrl: 'https://www.om.fr/fr/actualites',
    }))).toEqual({ status: 'OFFICIEL', reliability: 100 });
  });

  it('keeps media reporting as RUMEUR even when its headline says officiel', () => {
    expect(transferStatus(rssItem({
      title: 'Officiel selon nos informations : un joueur arrive',
      source: 'RMC Sport',
      sourceUrl: 'https://rmcsport.bfmtv.com/football/',
    }))).toEqual({ status: 'RUMEUR', reliability: 72 });
  });
});

describe('sports mapping', () => {
  it('does not expose zero scores for a scheduled match', () => {
    const mapped = mapEspnEvent({
      id: 'fixture-1',
      date: '2026-08-21T18:45:00.000Z',
      status: { type: { state: 'pre', completed: false, description: 'Scheduled' } },
      competitions: [{
        altGameNote: 'Ligue 1',
        status: { type: { state: 'pre', completed: false, description: 'Scheduled' } },
        competitors: [
          { id: '176', homeAway: 'home', score: '0', team: { id: '176', abbreviation: 'OLM', displayName: 'Marseille' } },
          { id: '180', homeAway: 'away', score: '0', team: { id: '180', abbreviation: 'STR', displayName: 'Strasbourg' } },
        ],
      }],
    } as never, 'Ligue 1', 'fra.1');

    expect(mapped?.status).toBe('SCHEDULED');
    expect(mapped?.home.score).toBeUndefined();
    expect(mapped?.away.score).toBeUndefined();
  });
});

describe('RSS parser', () => {
  it('normalizes the publisher, link and publication date', () => {
    const items = parseRss(`<?xml version="1.0"?><rss><channel><item>
      <title>Actualite OM</title>
      <link>https://example.com/article</link>
      <pubDate>Wed, 15 Jul 2026 12:00:00 GMT</pubDate>
      <source url="https://example.com">Exemple</source>
    </item></channel></rss>`);
    expect(items).toHaveLength(1);
    expect(items[0]?.source).toBe('Exemple');
    expect(items[0]?.sourceUrl).toBe('https://example.com/');
    expect(items[0]?.url).toBe('https://example.com/article');
  });
});
