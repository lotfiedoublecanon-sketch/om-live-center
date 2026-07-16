import type { Match, WidgetPayload } from '../types';

export const STORAGE_KEY = 'om-live-center:last-payload:v2';
export const MIN_REFRESH_SECONDS = 5;
export const MAX_REFRESH_SECONDS = 120;

export function refreshDelay(payload: WidgetPayload | null): number {
  const seconds = Number(payload?.refreshAfterSeconds) || 60;
  return Math.max(MIN_REFRESH_SECONDS, Math.min(MAX_REFRESH_SECONDS, seconds)) * 1000;
}

export function readStoredPayload(): WidgetPayload | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as WidgetPayload | null;
    return value?.hero && Array.isArray(value.sources) ? value : null;
  } catch { return null; }
}

export function storePayload(payload: WidgetPayload): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* private mode */ }
}

const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function reconcilePayload(previous: WidgetPayload | null, next: WidgetPayload): WidgetPayload {
  if (!previous) return next;
  const keys: Array<keyof WidgetPayload> = ['hero', 'pitch', 'timeline', 'news', 'transfers', 'fixtures', 'results', 'standings', 'squad', 'sources'];
  const output = { ...next };
  for (const key of keys) {
    if (same(previous[key], next[key])) (output as Record<string, unknown>)[key] = previous[key];
  }
  return output;
}

export function matchSnapshot(match?: Match) {
  return match ? { id: match.id, status: match.status, minute: match.minute, home: match.home.score, away: match.away.score } : null;
}
