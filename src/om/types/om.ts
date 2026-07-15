export type CacheState = 'HIT' | 'MISS' | 'STALE' | 'EMPTY';

export type MatchStatus =
  | 'LIVE'
  | 'HALF_TIME'
  | 'SCHEDULED'
  | 'FINISHED'
  | 'POSTPONED'
  | 'SUSPENDED'
  | 'UNAVAILABLE';

export type TimelineEventType =
  | 'goal'
  | 'yellow-card'
  | 'red-card'
  | 'substitution'
  | 'kickoff'
  | 'half-time'
  | 'full-time'
  | 'attack'
  | 'info';

export interface OmTeam {
  id?: string;
  code: string;
  name: string;
  shortName: string;
  score?: number;
  logo?: string;
  winner?: boolean;
}

export interface OmMatch {
  id: string;
  status: MatchStatus;
  minute?: string;
  competition: string;
  kickoff: string;
  home: OmTeam;
  away: OmTeam;
  stadium?: string;
  event?: string;
  source: string;
  sourceUrl?: string;
  providerCompetition?: string;
  verified: boolean;
}

export interface OmTimelineEvent {
  id: string;
  minute: string;
  type: TimelineEventType;
  team?: string;
  text: string;
}

export interface OmPitchPlayer {
  id: string;
  name: string;
  team: 'OM' | 'OPPONENT';
  x: number;
  y: number;
}

export interface OmPitch {
  available: boolean;
  message: string;
  source?: string;
  ball?: { x: number; y: number };
  path?: Array<{ x: number; y: number }>;
  players: OmPitchPlayer[];
}

export interface OmNewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  sourceUrl?: string;
  url: string;
  publishedAt: string;
  tag: 'Actu' | 'Mercato' | 'Conference' | 'Blessure' | 'Officiel' | 'Rumeur';
  official: boolean;
}

export interface OmTransferItem {
  id: string;
  headline: string;
  player?: string;
  direction: 'arrival' | 'departure' | 'extension' | 'unknown';
  status: 'OFFICIEL' | 'RUMEUR' | 'SURVEILLE';
  reliability: number;
  source: string;
  sourceUrl?: string;
  url: string;
  publishedAt: string;
}

export interface OmFixture extends OmMatch {
  homeAway: 'Domicile' | 'Exterieur';
}

export interface OmStandingRow {
  position: number;
  teamId: string;
  team: string;
  code: string;
  logo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isOm: boolean;
}

export interface OmSquadMember {
  id: string;
  name: string;
  shortName: string;
  number?: string;
  position: string;
  nationality?: string;
  image?: string;
  status: string;
  injuries: string[];
}

export interface SourceState {
  name: string;
  status: 'OK' | 'STALE' | 'ERROR' | 'EMPTY';
  cache: CacheState;
  items: number;
  checkedAt: string;
  message?: string;
}

export interface OmWidgetPayload {
  service: 'om-live-center';
  version: string;
  generatedAt: string;
  hero: OmMatch;
  pitch: OmPitch;
  timeline: OmTimelineEvent[];
  news: OmNewsItem[];
  transfers: OmTransferItem[];
  fixtures: OmFixture[];
  results: OmFixture[];
  standings: OmStandingRow[];
  squad: OmSquadMember[];
  sources: SourceState[];
  refreshAfterSeconds: number;
}

export interface CacheResult<T> {
  value: T;
  cache: CacheState;
  updatedAt: string;
}
