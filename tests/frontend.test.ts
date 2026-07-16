import { describe, expect, it } from 'vitest';
import { reconcilePayload, refreshDelay } from '../frontend/src/lib/widget';
import type { WidgetPayload } from '../frontend/src/types';

function payload(refreshAfterSeconds: number): WidgetPayload {
  return {
    service: 'om-live-center', version: '1.0.0', generatedAt: '2026-07-16T00:00:00Z', live: false, lastUpdatedAt: '2026-07-16T00:00:00Z',
    hero: { id: '1', live: false, status: 'SCHEDULED', competition: 'Match amical', competitionType: 'FRIENDLY', competitionLabel: 'Match amical', kickoff: '2026-07-17T19:00:00Z', home: { code: 'YFC', name: 'Yamoussoukro FC', shortName: 'Yamoussoukro FC' }, away: { code: 'OM', name: 'Olympique de Marseille', shortName: 'Marseille' }, source: 'OM.FR', lastUpdatedAt: '2026-07-16T00:00:00Z', verified: true },
    pitch: { available: false, message: 'Indisponible', players: [] }, timeline: [], news: [], transfers: [], fixtures: [], results: [], standings: [], squad: [], sources: [], refreshAfterSeconds,
  };
}

describe('frontend live policy', () => {
  it.each([[5, 5_000], [15, 15_000], [60, 60_000], [2, 5_000], [600, 120_000]])('clamps %s seconds to %s ms', (seconds, expected) => {
    expect(refreshDelay(payload(seconds))).toBe(expected);
  });

  it('keeps references for unchanged sections and updates only changed values', () => {
    const previous = payload(60);
    previous.news = [{ id: 'n1', title: 'OM', source: 'OM.FR', url: 'https://www.om.fr', publishedAt: previous.generatedAt, tag: 'Actu', official: true }];
    const next = structuredClone(previous);
    next.generatedAt = '2026-07-16T00:01:00Z';
    next.hero.minute = '12';
    const reconciled = reconcilePayload(previous, next);
    expect(reconciled.hero).not.toBe(previous.hero);
    expect(reconciled.news).toBe(previous.news);
    expect(reconciled.squad).toBe(previous.squad);
  });
});
