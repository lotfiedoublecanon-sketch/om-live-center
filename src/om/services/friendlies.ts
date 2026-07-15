import { omCache } from '../cache/stale-cache.js';
import { OM_CONFIG } from '../config.js';
import type { CacheState, OmMatch, OmTeam } from '../types/om.js';
import { fetchText } from './http.js';

interface IcsFields {
  UID?: string;
  DTSTAMP?: string;
  DTSTART?: string;
  DTEND?: string;
  SUMMARY?: string;
  DESCRIPTION?: string;
  LOCATION?: string;
  STATUS?: string;
}

export interface FriendlySourceResult {
  events: OmMatch[];
  cache: CacheState;
  updatedAt: string;
}

const FRIENDLY_PATTERN = /\b(match amical|amical|preparation|préparation|tournoi amical)\b/i;

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseIcsDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?(Z)?$/);
  if (!match) return undefined;
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const time = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

function teamFromOfficialCalendar(name: string): OmTeam {
  const isOm = /^(olympique de )?marseille$/i.test(name.trim());
  return {
    id: isOm ? OM_CONFIG.teamId : undefined,
    code: isOm ? 'OM' : '---',
    name,
    shortName: name,
    logo: isOm ? '/om/assets/logo-om-live.svg' : undefined,
  };
}

function friendlyLabel(description: string): string {
  if (/tournoi amical/i.test(description)) return 'Tournoi amical';
  if (/preparation|préparation/i.test(description)) return 'Préparation';
  return 'Match amical';
}

function parseFields(block: string): IcsFields {
  const fields: IcsFields = {};
  for (const line of block.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).split(';')[0] as keyof IcsFields;
    if (key in fields || !['UID', 'DTSTAMP', 'DTSTART', 'DTEND', 'SUMMARY', 'DESCRIPTION', 'LOCATION', 'STATUS'].includes(key)) {
      continue;
    }
    fields[key] = unescapeIcs(line.slice(separator + 1));
  }
  return fields;
}

export function parseOfficialFriendlies(ics: string, fetchedAt = new Date().toISOString()): OmMatch[] {
  return ics
    .split('BEGIN:VEVENT')
    .slice(1)
    .map((part) => part.split('END:VEVENT')[0] || '')
    .map(parseFields)
    .filter((fields) =>
      Boolean(fields.UID && fields.SUMMARY && fields.DTSTART)
      && FRIENDLY_PATTERN.test(fields.DESCRIPTION || '')
      && fields.STATUS?.toUpperCase() !== 'CANCELLED',
    )
    .map((fields): OmMatch | null => {
      const kickoff = parseIcsDate(fields.DTSTART);
      const teams = fields.SUMMARY?.split(/\s+vs\s+/i).map((value) => value.trim());
      if (!kickoff || !teams?.[0] || !teams[1]) return null;
      const label = friendlyLabel(fields.DESCRIPTION || '');
      const updatedAt = parseIcsDate(fields.DTSTAMP) || fetchedAt;
      return {
        id: `omfr:${fields.UID?.replace(/@om\.fr$/i, '')}`,
        live: false,
        status: 'SCHEDULED',
        competition: label,
        competitionType: 'FRIENDLY',
        competitionLabel: label,
        kickoff,
        home: teamFromOfficialCalendar(teams[0]),
        away: teamFromOfficialCalendar(teams[1]),
        stadium: fields.LOCATION || undefined,
        event: 'Match confirmé par le calendrier officiel OM',
        source: 'OM.FR - Calendrier officiel',
        sourceUrl: OM_CONFIG.officialCalendarPageUrl,
        providerCompetition: 'om.fr:calendar',
        lastUpdatedAt: updatedAt,
        verified: fields.STATUS?.toUpperCase() === 'CONFIRMED',
      };
    })
    .filter((match): match is OmMatch => match !== null)
    .sort((left, right) => Date.parse(left.kickoff) - Date.parse(right.kickoff));
}

export async function getOfficialFriendlies(): Promise<FriendlySourceResult> {
  const result = await omCache.get('omfr:calendar:friendlies', OM_CONFIG.sportsCacheMs, async () => {
    const fetchedAt = new Date().toISOString();
    const ics = await fetchText(OM_CONFIG.officialCalendarUrl);
    return parseOfficialFriendlies(ics, fetchedAt);
  });
  return { events: result.value, cache: result.cache, updatedAt: result.updatedAt };
}
