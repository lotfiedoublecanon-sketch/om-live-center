import { OM_CONFIG } from '../config.js';

export async function fetchText(url: string, timeoutMs = OM_CONFIG.timeoutMs): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json, application/rss+xml, application/xml, text/xml, */*',
      'user-agent': OM_CONFIG.userAgent,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Source HTTP ${response.status}`);
  }

  return response.text();
}

export async function fetchJson<T>(url: string, timeoutMs = OM_CONFIG.timeoutMs): Promise<T> {
  const text = await fetchText(url, timeoutMs);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Source JSON invalide');
  }
}

export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
