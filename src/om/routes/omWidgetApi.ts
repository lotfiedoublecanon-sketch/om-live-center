import type { Request, Response } from 'express';
import { getOmSports, type OmSportsBundle } from '../adapters/live.js';
import { getOmNews } from '../adapters/news.js';
import { getOmTransfers } from '../adapters/transfers.js';
import { getOmSquadSnapshot } from '../services/squad.js';
import type { OmNewsItem, OmTransferItem, OmWidgetPayload, SourceState } from '../types/om.js';

const emptySource = (name: string, message: string): SourceState => ({
  name,
  status: 'ERROR',
  cache: 'EMPTY',
  items: 0,
  checkedAt: new Date().toISOString(),
  message,
});

const emptySports = (): OmSportsBundle => {
  const squad = getOmSquadSnapshot();
  return ({
  hero: {
    id: 'om-source-unavailable',
    live: false,
    status: 'UNAVAILABLE',
    competition: 'Olympique de Marseille',
    competitionType: 'OFFICIAL',
    competitionLabel: 'Olympique de Marseille',
    kickoff: new Date().toISOString(),
    home: { code: 'OM', name: 'Olympique de Marseille', shortName: 'Marseille' },
    away: { code: '---', name: 'Adversaire a confirmer', shortName: 'A confirmer' },
    event: 'Source sportive temporairement indisponible',
    source: 'Derniere donnee indisponible',
    lastUpdatedAt: new Date().toISOString(),
    verified: false,
  },
  pitch: {
    available: false,
    message: 'Aucune position vérifiée disponible',
    players: [],
  },
  timeline: [],
  fixtures: [],
  results: [],
  standings: [],
  squad: squad.value,
  source: emptySource('ESPN Football Data', 'Source sportive temporairement indisponible'),
  friendliesSource: emptySource('OM.FR officiel + ESPN Club Friendly', 'Calendrier amical temporairement indisponible'),
  squadSource: {
    name: squad.source,
    status: squad.fallback ? 'STALE' : 'OK',
    cache: squad.cache,
    items: squad.value.length,
    checkedAt: squad.updatedAt,
    message: squad.fallback ? 'Dernier instantané officiel vérifié utilisé' : undefined,
  },
  });
};

function withinDeadline<T>(promise: Promise<T>, label: string, timeoutMs = 7_500): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} indisponible après ${timeoutMs} ms`)), timeoutMs);
    timer.unref();
  });
  return Promise.race([promise, deadline]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function refreshAfterSecondsForMatch(
  match: OmSportsBundle['hero'],
  now = Date.now(),
): 5 | 15 | 60 {
  if (match.status === 'LIVE' || match.status === 'HALF_TIME' || match.live) return 5;
  const kickoff = Date.parse(match.kickoff);
  const distance = kickoff - now;
  if (
    match.status === 'SCHEDULED'
    && Number.isFinite(kickoff)
    && distance <= 15 * 60_000
    && distance >= -120 * 60_000
  ) {
    return 15;
  }
  return 60;
}

const failedReason = (reason: unknown): string => {
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Source temporairement indisponible';
};

export async function omWidgetApi(_req: Request, res: Response): Promise<Response> {
  const [sportsResult, newsResult, transferResult] = await Promise.allSettled([
    withinDeadline(getOmSports(), 'Données sportives'),
    withinDeadline(getOmNews(), 'Actualités'),
    withinDeadline(getOmTransfers(), 'Mercato'),
  ]);

  const sports = sportsResult.status === 'fulfilled' ? sportsResult.value : emptySports();
  const news: OmNewsItem[] = newsResult.status === 'fulfilled' ? newsResult.value.items : [];
  const transfers: OmTransferItem[] = transferResult.status === 'fulfilled' ? transferResult.value.items : [];
  const sources: SourceState[] = [
    sports.source,
    sports.friendliesSource,
    sports.squadSource,
    newsResult.status === 'fulfilled'
      ? newsResult.value.source
      : emptySource('Flux RSS actualites', failedReason(newsResult.reason)),
    transferResult.status === 'fulfilled'
      ? transferResult.value.source
      : emptySource('Flux RSS mercato', failedReason(transferResult.reason)),
  ];
  const generatedAt = new Date().toISOString();
  const refreshAfterSeconds = refreshAfterSecondsForMatch(sports.hero);
  const payload: OmWidgetPayload = {
    service: 'om-live-center',
    version: '1.0.0',
    generatedAt,
    live: sports.hero.live,
    lastUpdatedAt: sports.hero.lastUpdatedAt || generatedAt,
    hero: sports.hero,
    pitch: sports.pitch,
    timeline: sports.timeline,
    news,
    transfers,
    fixtures: sports.fixtures,
    results: sports.results,
    standings: sports.standings,
    squad: sports.squad,
    sources,
    refreshAfterSeconds,
  };
  const cache = sources.some((source) => source.cache === 'STALE')
    ? 'STALE'
    : sources.some((source) => source.cache === 'MISS')
      ? 'MISS'
      : sources.every((source) => source.cache === 'HIT')
        ? 'HIT'
        : 'MIXED';

  res.setHeader('x-cache', cache);
  res.setHeader('x-refresh-after', String(refreshAfterSeconds));
  res.setHeader(
    'Cache-Control',
    `public, max-age=0, s-maxage=${refreshAfterSeconds}, stale-if-error=600`,
  );
  return res.status(200).json(payload);
}

export async function omHealthApi(_req: Request, res: Response): Promise<Response> {
  return res.status(200).json({
    status: 'ok',
    service: 'om-live-center',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
}
