import { createHash } from 'node:crypto';
import { OM_CONFIG } from '../config.js';
import { omCache } from '../cache/stale-cache.js';
import { dedupeRss, fetchGoogleNewsRss, type NormalizedRssItem } from '../services/rss.js';
import { isOfficialSource } from './news.js';
import type { OmTransferItem, SourceState } from '../types/om.js';

const TRUSTED_MEDIA = /l'equipe|l’équipe|rmc sport|la provence|france bleu|foot mercato|eurosport/i;

function directionFromTitle(title: string): OmTransferItem['direction'] {
  const normalized = title.toLowerCase();
  if (/prolong|nouveau contrat|extension/.test(normalized)) return 'extension';
  if (/depart|départ|quitte|vendu|vente|cede|cédé|prêté|prete/.test(normalized)) return 'departure';
  if (/arrive|arrivée|recrue|rejoint|signe|signature|accord/.test(normalized)) return 'arrival';
  return 'unknown';
}

export function transferStatus(item: NormalizedRssItem): Pick<OmTransferItem, 'status' | 'reliability'> {
  const official = isOfficialSource(item);
  const confirmedWording = /officiel|communique|communiqué|a signe|a signé|rejoint|prolonge|prolongé/i.test(
    item.title,
  );
  if (official && confirmedWording) return { status: 'OFFICIEL', reliability: 100 };
  if (TRUSTED_MEDIA.test(item.source)) return { status: 'RUMEUR', reliability: 72 };
  return { status: 'SURVEILLE', reliability: 48 };
}

function toTransfer(item: NormalizedRssItem): OmTransferItem {
  const status = transferStatus(item);
  return {
    id: createHash('sha1').update(item.url).digest('hex').slice(0, 16),
    headline: item.title,
    direction: directionFromTitle(item.title),
    source: item.source,
    sourceUrl: item.sourceUrl,
    url: item.url,
    publishedAt: item.publishedAt,
    ...status,
  };
}

export async function getOmTransfers(): Promise<{ items: OmTransferItem[]; source: SourceState }> {
  const result = await omCache.get('rss:om:transfers', OM_CONFIG.contentCacheMs, async () => {
    const feeds = await Promise.allSettled([
      fetchGoogleNewsRss('mercato "Olympique de Marseille"'),
      fetchGoogleNewsRss('transfert OM Marseille'),
      fetchGoogleNewsRss('site:om.fr signature OR prolongation OR transfert'),
    ]);
    const successful = feeds
      .filter((feed): feed is PromiseFulfilledResult<NormalizedRssItem[]> => feed.status === 'fulfilled')
      .flatMap((feed) => feed.value);
    if (!successful.length && feeds.every((feed) => feed.status === 'rejected')) {
      throw new Error('Flux mercato indisponibles');
    }
    return dedupeRss(successful).slice(0, 30).map(toTransfer);
  });

  return {
    items: result.value,
    source: {
      name: 'Flux RSS mercato sources',
      status: result.cache === 'STALE' ? 'STALE' : result.value.length ? 'OK' : 'EMPTY',
      cache: result.cache,
      items: result.value.length,
      checkedAt: result.updatedAt,
    },
  };
}
