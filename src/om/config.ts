const numberFromEnv = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const OM_CONFIG = {
  teamId: process.env.OM_TEAM_ID?.trim() || '176',
  competitions: (process.env.OM_COMPETITIONS ||
    'fra.1,uefa.champions,uefa.europa,uefa.europa.conf,fra.coupe_de_france')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  timeoutMs: numberFromEnv('OM_HTTP_TIMEOUT_MS', 4_500),
  liveCacheMs: Math.min(numberFromEnv('OM_LIVE_CACHE_MS', 5_000), 5_000),
  sportsCacheMs: numberFromEnv('OM_SPORTS_CACHE_MS', 600_000),
  contentCacheMs: numberFromEnv('OM_CONTENT_CACHE_MS', 450_000),
  friendlyCompetition: 'club.friendly',
  officialCalendarUrl: 'https://www.om.fr/api/calendar/men',
  officialCalendarPageUrl: 'https://www.om.fr/fr/equipe/hommes/calendrier',
  espnBaseUrl: 'https://site.api.espn.com/apis/site/v2/sports/soccer',
  espnStandingsBaseUrl: 'https://site.api.espn.com/apis/v2/sports/soccer',
  userAgent: 'OM-Live-Center/1.0 (+https://example.invalid/om-live-center)',
} as const;
