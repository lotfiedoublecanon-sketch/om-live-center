import { XMLParser } from 'fast-xml-parser';
import { fetchText, safeUrl } from './http.js';

export interface NormalizedRssItem {
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  source: string;
  sourceUrl?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

const asArray = <T>(value: T | T[] | undefined): T[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceFields(value: unknown): { source: string; sourceUrl?: string } {
  if (typeof value === 'string') return { source: cleanText(value) || 'Source non renseignee' };
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return {
      source: cleanText(source['#text']) || 'Source non renseignee',
      sourceUrl: safeUrl(source['@_url']),
    };
  }
  return { source: 'Source non renseignee' };
}

export function parseRss(xml: string): NormalizedRssItem[] {
  const parsed = parser.parse(xml) as {
    rss?: { channel?: { item?: unknown } };
    feed?: { entry?: unknown };
  };
  const items = [
    ...asArray(parsed.rss?.channel?.item as Record<string, unknown> | Record<string, unknown>[] | undefined),
    ...asArray(parsed.feed?.entry as Record<string, unknown> | Record<string, unknown>[] | undefined),
  ];

  return items.flatMap((item): NormalizedRssItem[] => {
    const source = sourceFields(item.source);
    const rawLink =
      typeof item.link === 'string'
        ? item.link
        : item.link && typeof item.link === 'object'
          ? (item.link as Record<string, unknown>)['@_href']
          : undefined;
    const url = safeUrl(rawLink);
    const title = cleanText(item.title);
    if (!url || !title) return [];
    const rawDate = item.pubDate || item.published || item.updated;
    const parsedDate = rawDate ? new Date(String(rawDate)) : new Date();
    return [
      {
        title,
        description: cleanText(item.description || item.summary || item.content) || undefined,
        url,
        publishedAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        ...source,
      },
    ];
  });
}

export async function fetchGoogleNewsRss(query: string): Promise<NormalizedRssItem[]> {
  const url = new URL('https://news.google.com/rss/search');
  url.searchParams.set('q', query);
  url.searchParams.set('hl', 'fr');
  url.searchParams.set('gl', 'FR');
  url.searchParams.set('ceid', 'FR:fr');
  return parseRss(await fetchText(url.toString()));
}

export function dedupeRss(items: NormalizedRssItem[]): NormalizedRssItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  return items
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((item) => {
      const titleKey = item.title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      if (seenUrls.has(item.url) || seenTitles.has(titleKey)) return false;
      seenUrls.add(item.url);
      seenTitles.add(titleKey);
      return true;
    });
}
