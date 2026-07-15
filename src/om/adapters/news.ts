import { createHash } from 'node:crypto';
import { OM_CONFIG } from '../config.js';
import { omCache } from '../cache/stale-cache.js';
import { dedupeRss, fetchGoogleNewsRss, type NormalizedRssItem } from '../services/rss.js';
import type { OmNewsItem, SourceState } from '../types/om.js';

const OFFICIAL_HOSTS = ['om.fr', 'ligue1.com', 'fff.fr', 'uefa.com'];

export function isOfficialSource(item: Pick<NormalizedRssItem, 'source' | 'sourceUrl'>): boolean {
  if (item.sourceUrl) {
    try {
      const host = new URL(item.sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
      if (OFFICIAL_HOSTS.some((officialHost) => host === officialHost || host.endsWith(`.${officialHost}`))) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return /olympique de marseille|ligue 1|uefa|federation francaise/i.test(item.source);
}

function tagFor(item: NormalizedRssItem): OmNewsItem['tag'] {
  const title = item.title.toLowerCase();
  if (/bless|indisponib|forfait|infirmerie/.test(title)) return 'Blessure';
  if (/conference|conférence|interview|declaration|déclaration/.test(title)) return 'Conference';
  if (/mercato|transfert|recrue|signature|prolong|depart|départ/.test(title)) {
    if (isOfficialSource(item) && /officiel|communique|communiqué|signe|signature|prolong/.test(title)) {
      return 'Officiel';
    }
    return 'Mercato';
  }
  if (/rumeur|piste|interesse|intéresse|cible/.test(title)) return 'Rumeur';
  return 'Actu';
}

function toNews(item: NormalizedRssItem): OmNewsItem {
  return {
    id: createHash('sha1').update(item.url).digest('hex').slice(0, 16),
    title: item.title,
    summary: item.description,
    source: item.source,
    sourceUrl: item.sourceUrl,
    url: item.url,
    publishedAt: item.publishedAt,
    tag: tagFor(item),
    official: isOfficialSource(item),
  };
}

export async function getOmNews(): Promise<{ items: OmNewsItem[]; source: SourceState }> {
  const result = await omCache.get('rss:om:news', OM_CONFIG.contentCacheMs, async () => {
    const feeds = await Promise.allSettled([
      fetchGoogleNewsRss('site:om.fr "Olympique de Marseille"'),
      fetchGoogleNewsRss('site:ligue1.com "Olympique de Marseille"'),
      fetchGoogleNewsRss('"Olympique de Marseille" OR "OM Marseille"'),
    ]);
    const successful = feeds
      .filter((feed): feed is PromiseFulfilledResult<NormalizedRssItem[]> => feed.status === 'fulfilled')
      .flatMap((feed) => feed.value);
    if (!successful.length && feeds.every((feed) => feed.status === 'rejected')) {
      throw new Error('Flux RSS OM indisponibles');
    }
    return dedupeRss(successful).slice(0, 36).map(toNews);
  });

  return {
    items: result.value,
    source: {
      name: 'Google News RSS et éditeurs sources',
      status: result.cache === 'STALE' ? 'STALE' : result.value.length ? 'OK' : 'EMPTY',
      cache: result.cache,
      items: result.value.length,
      checkedAt: result.updatedAt,
    },
  };
}
