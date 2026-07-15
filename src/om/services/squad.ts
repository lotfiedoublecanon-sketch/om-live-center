import * as cheerio from 'cheerio';
import fallbackJson from '../data/om-squad-fallback.json' with { type: 'json' };
import { OM_CONFIG } from '../config.js';
import { omCache } from '../cache/stale-cache.js';
import type { CacheResult, OmSquadMember } from '../types/om.js';
import { fetchText, safeUrl } from './http.js';

const OFFICIAL_SQUAD_URL = 'https://www.om.fr/fr/equipe/hommes';
const OFFICIAL_SOURCE = 'OM.FR - Équipe première';
const FALLBACK_SOURCE = 'OM.FR - instantané vérifié du 15 juillet 2026';
const MIN_VALID_SQUAD = 18;
const VALID_POSITIONS = new Set(['Gardien', 'Défenseur', 'Milieu', 'Attaquant']);

interface OfficialPlayer {
  id?: string;
  name?: string;
  slug?: string;
  number?: string | number | null;
  teamKey?: string;
  position?: string;
  cardImage?: { asset?: { url?: string } };
  image?: { asset?: { url?: string } };
}

interface FallbackPlayer {
  id: string;
  name: string;
  slug: string;
  number: string | null;
  position: string;
  nationality: string | null;
  photoOrigin: string;
  status: string | null;
}

export interface OmSquadResult extends CacheResult<OmSquadMember[]> {
  source: string;
  fallback: boolean;
}

const fallbackPlayers = fallbackJson as FallbackPlayer[];
const fallbackBySlug = new Map(fallbackPlayers.map((player) => [player.slug, player]));
const photoOrigins = new Map<string, string>();

function extractBalancedArray(value: string, marker: string): string | null {
  const markerIndex = value.indexOf(marker);
  const start = value.indexOf('[', markerIndex);
  if (markerIndex < 0 || start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '[') depth += 1;
    else if (character === ']' && --depth === 0) return value.slice(start, index + 1);
  }
  return null;
}

function officialPlayersFromNextData(html: string): OfficialPlayer[] {
  const $ = cheerio.load(html);
  let players: OfficialPlayer[] = [];

  $('script').each((_index, element) => {
    if (players.length) return;
    const script = $(element).html() || '';
    if (!script.includes('players')) return;
    const match = script.match(/^self\.__next_f\.push\(\[1,(.*)\]\)$/s);
    if (!match?.[1]) return;
    try {
      const decoded = JSON.parse(match[1]) as string;
      const arrayText = extractBalancedArray(decoded, '"players":');
      if (arrayText) players = JSON.parse(arrayText) as OfficialPlayer[];
    } catch {
      // Ignore unrelated Next.js chunks.
    }
  });
  return players;
}

function proxyPhoto(id: string): string {
  return `/api/om/player-photo/${encodeURIComponent(id)}`;
}

function registerPhoto(id: string, origin: unknown): boolean {
  const url = safeUrl(origin);
  if (!url || new URL(url).hostname !== 'cdn.sanity.io') return false;
  photoOrigins.set(id, url);
  return true;
}

function fallbackSquad(): OmSquadMember[] {
  const updatedAt = '2026-07-15T00:00:00.000Z';
  return fallbackPlayers.map((player) => {
    const hasPhoto = registerPhoto(player.id, player.photoOrigin);
    return {
      id: player.id,
      name: player.name,
      shortName: player.name,
      number: player.number,
      position: player.position as OmSquadMember['position'],
      nationality: player.nationality,
      photo: hasPhoto ? proxyPhoto(player.id) : null,
      image: hasPhoto ? proxyPhoto(player.id) : undefined,
      status: player.status,
      injuries: [],
      source: FALLBACK_SOURCE,
      updatedAt,
    };
  });
}

export function parseOfficialSquad(html: string, updatedAt = new Date().toISOString()): OmSquadMember[] {
  const officialPlayers = officialPlayersFromNextData(html);
  const seen = new Set<string>();
  const normalized: OmSquadMember[] = [];

  for (const player of officialPlayers) {
    const slug = player.slug?.trim();
    const name = player.name?.trim();
    const position = player.position?.trim();
    if (player.teamKey !== 'men' || !slug || !name || !position || !VALID_POSITIONS.has(position) || seen.has(slug)) continue;
    seen.add(slug);
    const fallback = fallbackBySlug.get(slug);
    const origin = player.cardImage?.asset?.url || player.image?.asset?.url || fallback?.photoOrigin;
    const hasPhoto = registerPhoto(slug, origin);
    const number = player.number === null || player.number === undefined ? fallback?.number ?? null : String(player.number);
    normalized.push({
      id: slug,
      name,
      shortName: name,
      number,
      position: position as OmSquadMember['position'],
      nationality: fallback?.nationality ?? null,
      photo: hasPhoto ? proxyPhoto(slug) : null,
      image: hasPhoto ? proxyPhoto(slug) : undefined,
      status: fallback?.status ?? null,
      injuries: [],
      source: OFFICIAL_SOURCE,
      updatedAt,
    });
  }

  return normalized.sort((left, right) => {
    const order = ['Gardien', 'Défenseur', 'Milieu', 'Attaquant'];
    return order.indexOf(left.position) - order.indexOf(right.position) || left.name.localeCompare(right.name, 'fr');
  });
}

async function loadOfficialSquad(): Promise<OmSquadMember[]> {
  const html = await fetchText(OFFICIAL_SQUAD_URL, Math.max(OM_CONFIG.timeoutMs, 8_000));
  const players = parseOfficialSquad(html);
  if (players.length < MIN_VALID_SQUAD) throw new Error(`Effectif officiel incomplet (${players.length} joueurs)`);
  return players;
}

export async function getOmSquad(): Promise<OmSquadResult> {
  try {
    const result = await omCache.get('om-fr:squad:first-team', OM_CONFIG.sportsCacheMs, loadOfficialSquad);
    return { ...result, source: result.value[0]?.source || OFFICIAL_SOURCE, fallback: false };
  } catch {
    const value = fallbackSquad();
    return { value, cache: 'STALE', updatedAt: value[0]?.updatedAt || new Date().toISOString(), source: FALLBACK_SOURCE, fallback: true };
  }
}

export async function getSquadPhotoOrigin(playerId: string): Promise<string | null> {
  if (!photoOrigins.has(playerId)) await getOmSquad();
  return photoOrigins.get(playerId) || null;
}

