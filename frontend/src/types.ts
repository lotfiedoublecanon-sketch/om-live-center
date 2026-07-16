export type MatchStatus = 'LIVE' | 'HALF_TIME' | 'SCHEDULED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'UNAVAILABLE';
export type CacheState = 'HIT' | 'MISS' | 'STALE' | 'EMPTY';

export interface Team {
  id?: string;
  code: string;
  name: string;
  shortName: string;
  score?: number;
  logo?: string;
}

export interface Match {
  id: string;
  live: boolean;
  status: MatchStatus;
  minute?: string;
  competition: string;
  competitionType: 'FRIENDLY' | 'OFFICIAL';
  competitionLabel: string;
  kickoff: string;
  home: Team;
  away: Team;
  stadium?: string;
  event?: string;
  source: string;
  sourceUrl?: string;
  lastUpdatedAt: string;
  verified: boolean;
  homeAway?: 'Domicile' | 'Exterieur';
}

export interface TimelineEvent { id: string; minute: string; type: string; team?: string; text: string }
export interface PitchPlayer { id: string; name: string; team: 'OM' | 'OPPONENT'; x: number; y: number }
export interface Pitch {
  available: boolean;
  message: string;
  source?: string;
  ball?: { x: number; y: number };
  path?: Array<{ x: number; y: number }>;
  players: PitchPlayer[];
}
export interface NewsItem { id: string; title: string; summary?: string; source: string; url: string; publishedAt: string; tag: string; official: boolean }
export interface TransferItem { id: string; headline: string; player?: string; direction: string; status: 'OFFICIEL' | 'RUMEUR' | 'SURVEILLE'; reliability: number; source: string; url: string; publishedAt: string }
export interface Standing { position: number; teamId: string; team: string; code: string; logo?: string; played: number; won: number; drawn: number; lost: number; goalDifference: number; points: number; isOm: boolean }
export interface SquadMember { id: string; name: string; shortName: string; number: string | null; position: 'Gardien' | 'Défenseur' | 'Milieu' | 'Attaquant'; nationality: string | null; photo: string | null; image?: string; status: string | null; injuries: string[]; source: string; updatedAt: string }
export interface SourceState { name: string; status: 'OK' | 'STALE' | 'ERROR' | 'EMPTY'; cache: CacheState; items: number; checkedAt: string; message?: string }

export interface WidgetPayload {
  service: 'om-live-center';
  version: string;
  generatedAt: string;
  live: boolean;
  lastUpdatedAt: string;
  hero: Match;
  pitch: Pitch;
  timeline: TimelineEvent[];
  news: NewsItem[];
  transfers: TransferItem[];
  fixtures: Match[];
  results: Match[];
  standings: Standing[];
  squad: SquadMember[];
  sources: SourceState[];
  refreshAfterSeconds: number;
}

export type TabId = 'live' | 'news' | 'transfers' | 'calendar' | 'standings' | 'squad';
export type ConnectionState = 'connecting' | 'online' | 'cached' | 'offline';
