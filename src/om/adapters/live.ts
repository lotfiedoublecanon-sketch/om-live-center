import { OM_CONFIG } from '../config.js';
import { omCache } from '../cache/stale-cache.js';
import { fetchJson, safeUrl } from '../services/http.js';
import { getOmSquad } from '../services/squad.js';
import type {
  CacheState,
  MatchStatus,
  OmFixture,
  OmMatch,
  OmPitch,
  OmSquadMember,
  OmStandingRow,
  OmTimelineEvent,
  SourceState,
  TimelineEventType,
} from '../types/om.js';

interface EspnTeam {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
  logo?: string;
  logos?: Array<{ href?: string }>;
}

interface EspnCompetitor {
  id?: string;
  homeAway?: 'home' | 'away';
  winner?: boolean;
  score?: string;
  team?: EspnTeam;
}

interface EspnStatus {
  clock?: number;
  displayClock?: string;
  type?: {
    name?: string;
    state?: 'pre' | 'in' | 'post';
    completed?: boolean;
    description?: string;
    detail?: string;
    shortDetail?: string;
  };
}

interface EspnCompetition {
  id?: string;
  date?: string;
  altGameNote?: string;
  competitors?: EspnCompetitor[];
  status?: EspnStatus;
  venue?: { fullName?: string };
  details?: EspnDetail[];
}

interface EspnEvent {
  id?: string;
  date?: string;
  name?: string;
  status?: EspnStatus;
  competitions?: EspnCompetition[];
  links?: Array<{ href?: string; rel?: string[] }>;
}

interface EspnScoreboard {
  events?: EspnEvent[];
  leagues?: Array<{ name?: string; abbreviation?: string }>;
}

interface EspnDetail {
  clock?: { displayValue?: string };
  addedClock?: { displayValue?: string };
  scoringPlay?: boolean;
  redCard?: boolean;
  yellowCard?: boolean;
  substitution?: boolean;
  team?: EspnTeam;
  participants?: Array<{ athlete?: { displayName?: string; shortName?: string } }>;
  text?: string;
}

interface EspnSummary {
  header?: { competitions?: EspnCompetition[] };
  keyEvents?: EspnDetail[];
  commentary?: Array<{
    sequence?: number;
    time?: { displayValue?: string };
    text?: string;
    team?: EspnTeam;
  }>;
}

interface EspnStandingStat {
  type?: string;
  name?: string;
  value?: number;
  displayValue?: string;
}

interface EspnStandings {
  children?: Array<{
    standings?: {
      entries?: Array<{
        team?: EspnTeam;
        stats?: EspnStandingStat[];
      }>;
    };
  }>;
}

export interface OmSportsBundle {
  hero: OmMatch;
  pitch: OmPitch;
  timeline: OmTimelineEvent[];
  fixtures: OmFixture[];
  results: OmFixture[];
  standings: OmStandingRow[];
  squad: OmSquadMember[];
  source: SourceState;
  squadSource: SourceState;
}

const isoDay = (date: Date): string => date.toISOString().slice(0, 10).replaceAll('-', '');

function currentWindow(): string {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 1);
  return `${isoDay(start)}-${isoDay(end)}`;
}

function currentSeasonWindow(): string {
  const now = new Date();
  const startYear = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${startYear}0701-${startYear + 1}0630`;
}

function cacheState(states: CacheState[]): CacheState {
  if (states.includes('STALE')) return 'STALE';
  if (states.includes('MISS')) return 'MISS';
  if (states.every((state) => state === 'HIT')) return 'HIT';
  return 'EMPTY';
}

function statusFromEspn(status?: EspnStatus): MatchStatus {
  const type = status?.type;
  const text = `${type?.name ?? ''} ${type?.description ?? ''} ${type?.detail ?? ''}`.toLowerCase();

  if (type?.completed || type?.state === 'post' || text.includes('full time')) return 'FINISHED';
  if (text.includes('postpon')) return 'POSTPONED';
  if (text.includes('suspend') || text.includes('abandon')) return 'SUSPENDED';
  if (type?.state === 'in' && (text.includes('half') || text.includes('halftime'))) return 'HALF_TIME';
  if (type?.state === 'in') return 'LIVE';
  if (type?.state === 'pre') return 'SCHEDULED';
  return 'UNAVAILABLE';
}

function teamFromCompetitor(competitor: EspnCompetitor | undefined, includeScore: boolean) {
  const team = competitor?.team;
  const teamId = competitor?.id ?? team?.id;
  const score = includeScore && competitor?.score !== undefined ? Number(competitor.score) : undefined;
  return {
    id: teamId,
    code: teamId === OM_CONFIG.teamId ? 'OM' : team?.abbreviation || '---',
    name: team?.displayName || team?.name || 'Équipe à confirmer',
    shortName: team?.shortDisplayName || team?.name || team?.abbreviation || 'Equipe',
    score: Number.isFinite(score) ? score : undefined,
    logo:
      teamId === OM_CONFIG.teamId
        ? '/om/assets/logo-om-live.svg'
        : teamId && /^\d+$/.test(teamId)
          ? `/api/om/team-logo/${teamId}`
          : safeUrl(team?.logo || team?.logos?.[0]?.href),
    winner: competitor?.winner || undefined,
  };
}

export function mapEspnEvent(
  event: EspnEvent,
  leagueName = 'Football',
  providerCompetition = 'fra.1',
): OmMatch | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((item) => item.homeAway === 'home');
  const away = competition?.competitors?.find((item) => item.homeAway === 'away');
  if (!event.id || !event.date || !competition || !home || !away) return null;

  const status = statusFromEspn(competition.status || event.status);
  const includeScore = status === 'LIVE' || status === 'HALF_TIME' || status === 'FINISHED';
  const detail = competition.status?.type?.detail || event.status?.type?.detail;

  return {
    id: event.id,
    status,
    minute:
      status === 'LIVE' || status === 'HALF_TIME'
        ? competition.status?.displayClock || event.status?.displayClock
        : undefined,
    competition: competition.altGameNote || leagueName,
    kickoff: event.date,
    home: teamFromCompetitor(home, includeScore),
    away: teamFromCompetitor(away, includeScore),
    stadium: competition.venue?.fullName,
    event:
      status === 'SCHEDULED'
        ? "Coup d'envoi programmé"
        : status === 'FINISHED'
          ? 'Match terminé'
          : detail,
    source: 'ESPN Football Data',
    sourceUrl:
      safeUrl(event.links?.find((link) => link.rel?.includes('summary'))?.href) ||
      `https://www.espn.com/soccer/match/_/gameId/${event.id}`,
    providerCompetition,
    verified: true,
  };
}

async function competitionEvents(
  league: string,
  dates: string,
  ttlMs: number,
): Promise<{ events: OmMatch[]; cache: CacheState; updatedAt: string }> {
  const key = `espn:${league}:${dates}`;
  const result = await omCache.get(key, ttlMs, async () => {
    const url = `${OM_CONFIG.espnBaseUrl}/${encodeURIComponent(league)}/scoreboard?dates=${dates}&limit=1000`;
    const payload = await fetchJson<EspnScoreboard>(url);
    const leagueName = payload.leagues?.[0]?.name || payload.leagues?.[0]?.abbreviation || league;
    return (payload.events || [])
      .filter((event) =>
        event.competitions?.some((competition) =>
          competition.competitors?.some((competitor) => competitor.id === OM_CONFIG.teamId),
        ),
      )
      .map((event) => mapEspnEvent(event, leagueName, league))
      .filter((event): event is OmMatch => event !== null);
  });
  return { events: result.value, cache: result.cache, updatedAt: result.updatedAt };
}

async function eventsForAllCompetitions(dates: string, ttlMs: number) {
  const settled = await Promise.allSettled(
    OM_CONFIG.competitions.map((league) => competitionEvents(league, dates, ttlMs)),
  );
  const successful = settled
    .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof competitionEvents>>> =>
      item.status === 'fulfilled',
    )
    .map((item) => item.value);
  const byId = new Map<string, OmMatch>();
  successful.flatMap((item) => item.events).forEach((event) => byId.set(event.id, event));
  return {
    events: [...byId.values()].sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff)),
    cache: cacheState(successful.map((item) => item.cache)),
    updatedAt: successful.map((item) => item.updatedAt).sort().at(-1) || new Date().toISOString(),
    errors: settled.filter((item) => item.status === 'rejected').length,
  };
}

async function getStandings() {
  const result = await omCache.get('espn:standings:fra.1', OM_CONFIG.sportsCacheMs, async () => {
    const payload = await fetchJson<EspnStandings>(`${OM_CONFIG.espnStandingsBaseUrl}/fra.1/standings`);
    const entries = payload.children?.flatMap((child) => child.standings?.entries || []) || [];
    return entries.map((entry, index): OmStandingRow => {
      const stats = new Map((entry.stats || []).map((stat) => [stat.type || stat.name || '', stat.value || 0]));
      const team = entry.team;
      return {
        position: stats.get('rank') || index + 1,
        teamId: team?.id || `team-${index}`,
        team: team?.displayName || team?.name || 'Equipe',
        code: team?.abbreviation || '---',
        logo:
          team?.id === OM_CONFIG.teamId
            ? '/om/assets/logo-om-live.svg'
            : team?.id && /^\d+$/.test(team.id)
              ? `/api/om/team-logo/${team.id}`
              : safeUrl(team?.logos?.[0]?.href || team?.logo),
        played: stats.get('gamesplayed') || 0,
        won: stats.get('wins') || 0,
        drawn: stats.get('ties') || 0,
        lost: stats.get('losses') || 0,
        goalsFor: stats.get('pointsfor') || 0,
        goalsAgainst: stats.get('pointsagainst') || 0,
        goalDifference: stats.get('pointdifferential') || 0,
        points: stats.get('points') || 0,
        isOm: team?.id === OM_CONFIG.teamId,
      };
    });
  });
  return result;
}

function detailType(detail: EspnDetail): TimelineEventType {
  if (detail.scoringPlay) return 'goal';
  if (detail.redCard) return 'red-card';
  if (detail.yellowCard) return 'yellow-card';
  if (detail.substitution) return 'substitution';
  return 'info';
}

function detailText(detail: EspnDetail): string {
  if (detail.text) return detail.text;
  const player = detail.participants?.[0]?.athlete?.displayName;
  if (detail.scoringPlay) return player ? `But de ${player}` : 'But confirme par la source';
  if (detail.redCard) return player ? `Carton rouge pour ${player}` : 'Carton rouge';
  if (detail.yellowCard) return player ? `Carton jaune pour ${player}` : 'Carton jaune';
  if (detail.substitution) return player ? `Remplacement : ${player}` : 'Remplacement';
  return 'Evenement de match';
}

async function getTimeline(match: OmMatch): Promise<OmTimelineEvent[]> {
  if (match.status !== 'LIVE' && match.status !== 'HALF_TIME' && match.status !== 'FINISHED') return [];
  const ttl = match.status === 'FINISHED' ? OM_CONFIG.sportsCacheMs : OM_CONFIG.liveCacheMs;
  const result = await omCache.get(`espn:summary:${match.id}`, ttl, async () =>
    fetchJson<EspnSummary>(
      `${OM_CONFIG.espnBaseUrl}/${encodeURIComponent(match.providerCompetition || 'fra.1')}/summary?event=${encodeURIComponent(match.id)}`,
    ),
  );
  const competition = result.value.header?.competitions?.[0];
  const details = competition?.details || result.value.keyEvents || [];

  if (details.length) {
    return details
      .map((detail, index): OmTimelineEvent => ({
        id: `${match.id}-detail-${index}`,
        minute: `${detail.clock?.displayValue || ''}${detail.addedClock?.displayValue || ''}` || '--',
        type: detailType(detail),
        team: detail.team?.abbreviation || detail.team?.shortDisplayName,
        text: detailText(detail),
      }))
      .sort((a, b) => Number.parseInt(b.minute) - Number.parseInt(a.minute))
      .slice(0, 16);
  }

  return (result.value.commentary || [])
    .filter((item) => item.text)
    .slice(-16)
    .reverse()
    .map((item, index): OmTimelineEvent => ({
      id: `${match.id}-comment-${item.sequence ?? index}`,
      minute: item.time?.displayValue || '--',
      type: 'info',
      team: item.team?.abbreviation,
      text: item.text || 'Evenement de match',
    }));
}

function placeholderHero(): OmMatch {
  return {
    id: 'om-no-match',
    status: 'UNAVAILABLE',
    competition: 'Olympique de Marseille',
    kickoff: new Date().toISOString(),
    home: { code: 'OM', name: 'Olympique de Marseille', shortName: 'Marseille' },
    away: { code: '---', name: 'Prochain adversaire a confirmer', shortName: 'A confirmer' },
    event: 'Aucun match OM confirmé pour le moment',
    source: 'Aucune source active',
    verified: false,
  };
}

function asFixture(match: OmMatch): OmFixture {
  return {
    ...match,
    homeAway: match.home.id === OM_CONFIG.teamId ? 'Domicile' : 'Exterieur',
  };
}

export async function getOmSports(): Promise<OmSportsBundle> {
  const now = Date.now();
  const [liveWindow, season, standingsResult, squadResult] = await Promise.all([
    eventsForAllCompetitions(currentWindow(), OM_CONFIG.liveCacheMs),
    eventsForAllCompetitions(currentSeasonWindow(), OM_CONFIG.sportsCacheMs),
    getStandings().catch(() => null),
    getOmSquad().catch(() => null),
  ]);

  const allById = new Map<string, OmMatch>();
  [...season.events, ...liveWindow.events].forEach((match) => allById.set(match.id, match));
  const all = [...allById.values()].sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  const live = all.find((match) => match.status === 'LIVE' || match.status === 'HALF_TIME');
  const next = all.find((match) => match.status === 'SCHEDULED' && Date.parse(match.kickoff) >= now);
  const last = [...all]
    .reverse()
    .find((match) => match.status === 'FINISHED' && Date.parse(match.kickoff) < now);
  const hero = live || next || last || placeholderHero();
  const timeline = hero.verified ? await getTimeline(hero).catch(() => []) : [];
  if (timeline[0]?.text && (hero.status === 'LIVE' || hero.status === 'HALF_TIME')) hero.event = timeline[0].text;

  const fixtures = all
    .filter((match) => match.status === 'SCHEDULED' && Date.parse(match.kickoff) >= now)
    .slice(0, 18)
    .map(asFixture);
  const results = all
    .filter((match) => match.status === 'FINISHED' && Date.parse(match.kickoff) < now)
    .slice(-10)
    .reverse()
    .map(asFixture);
  const standings = standingsResult?.value || [];
  const squad = squadResult?.value || [];
  const combinedCache = cacheState([
    liveWindow.cache,
    season.cache,
    standingsResult?.cache || 'EMPTY',
  ]);
  const hasStale = combinedCache === 'STALE';
  const sourceErrors = liveWindow.errors + season.errors;

  return {
    hero,
    pitch: {
      available: false,
      message:
        hero.status === 'LIVE' || hero.status === 'HALF_TIME'
          ? 'Positions du ballon indisponibles chez la source live'
          : "Le mini-stade s'activera si une source fournit des positions vérifiées",
      source: hero.source,
      players: [],
    },
    timeline,
    fixtures,
    results,
    standings,
    squad,
    source: {
      name: 'ESPN Football Data',
      status: hasStale ? 'STALE' : all.length || standings.length ? 'OK' : 'EMPTY',
      cache: combinedCache,
      items: all.length + standings.length,
      checkedAt: [liveWindow.updatedAt, season.updatedAt, standingsResult?.updatedAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) || new Date().toISOString(),
      message: sourceErrors ? `${sourceErrors} competition(s) indisponible(s), autres sources conservees` : undefined,
    },
    squadSource: {
      name: squadResult?.source || 'OM.FR - Équipe première',
      status: squadResult ? (squadResult.cache === 'STALE' ? 'STALE' : 'OK') : 'ERROR',
      cache: squadResult?.cache || 'EMPTY',
      items: squad.length,
      checkedAt: squadResult?.updatedAt || new Date().toISOString(),
      message: squadResult?.fallback ? 'Dernier instantané officiel vérifié utilisé' : undefined,
    },
  };
}
