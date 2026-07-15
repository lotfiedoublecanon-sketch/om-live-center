import { describe, expect, it } from 'vitest';
import { deduplicateMatches } from '../src/om/adapters/live.js';
import { refreshAfterSecondsForMatch } from '../src/om/routes/omWidgetApi.js';
import { parseOfficialFriendlies } from '../src/om/services/friendlies.js';
import type { OmMatch } from '../src/om/types/om.js';

const officialIcs = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:confirmed-friendly@om.fr
DTSTAMP:20260715T214734Z
DTSTART:20260717T190000Z
DTEND:20260717T210000Z
SUMMARY:Yamoussoukro FC vs Marseille
DESCRIPTION:Match amical - 2026/2027
LOCATION:Stade Felix Houphouet-Boigny
STATUS:CONFIRMED
END:VEVENT
BEGIN:VEVENT
UID:league-match@om.fr
DTSTART:20260821T184500Z
SUMMARY:Marseille vs Strasbourg
DESCRIPTION:Ligue 1 - J1
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

function match(overrides: Partial<OmMatch> = {}): OmMatch {
  return {
    id: 'fixture',
    live: false,
    status: 'SCHEDULED',
    competition: 'Match amical',
    competitionType: 'FRIENDLY',
    competitionLabel: 'Match amical',
    kickoff: '2026-07-17T19:00:00.000Z',
    home: { code: 'YAM', name: 'Yamoussoukro FC', shortName: 'Yamoussoukro FC' },
    away: { id: '176', code: 'OM', name: 'Marseille', shortName: 'Marseille' },
    source: 'OM.FR - Calendrier officiel',
    sourceUrl: 'https://www.om.fr/fr/equipe/hommes/calendrier',
    lastUpdatedAt: '2026-07-15T21:47:34.000Z',
    verified: true,
    ...overrides,
  };
}

describe('OM friendly fixtures', () => {
  it('keeps only confirmed friendly events from the official calendar', () => {
    const fixtures = parseOfficialFriendlies(officialIcs, '2026-07-15T22:00:00.000Z');
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]).toMatchObject({
      competitionType: 'FRIENDLY',
      competitionLabel: 'Match amical',
      verified: true,
      source: 'OM.FR - Calendrier officiel',
      stadium: 'Stade Felix Houphouet-Boigny',
    });
  });

  it('deduplicates the official fixture and lets confirmed live data win', () => {
    const live = match({
      id: 'espn-live',
      live: true,
      status: 'LIVE',
      minute: "23'",
      home: { code: 'YFC', name: 'Yamoussoukro FC', shortName: 'Yamoussoukro FC', score: 0 },
      away: { id: '176', code: 'OM', name: 'Marseille', shortName: 'Marseille', score: 1 },
      source: 'ESPN Football Data',
      providerCompetition: 'club.friendly',
    });

    const merged = deduplicateMatches([match(), live]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'espn-live', live: true, status: 'LIVE', competitionType: 'FRIENDLY' });
    expect(merged[0]?.away.score).toBe(1);
  });
});

describe('live refresh policy', () => {
  const now = Date.parse('2026-07-17T18:50:00.000Z');

  it('uses 5 seconds for a confirmed live match', () => {
    expect(refreshAfterSecondsForMatch(match({ live: true, status: 'LIVE' }), now)).toBe(5);
  });

  it('uses 15 seconds inside the pre-match window', () => {
    expect(refreshAfterSecondsForMatch(match({ kickoff: '2026-07-17T19:00:00.000Z' }), now)).toBe(15);
  });

  it('uses 60 seconds outside live and pre-match', () => {
    expect(refreshAfterSecondsForMatch(match({ kickoff: '2026-07-18T19:00:00.000Z' }), now)).toBe(60);
    expect(refreshAfterSecondsForMatch(match({ status: 'FINISHED', live: false }), now)).toBe(60);
  });
});
