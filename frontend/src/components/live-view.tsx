import { memo, useState } from 'react';
import { Activity, Clock3, ExternalLink, MapPin, Radio, ShieldCheck, Trophy } from 'lucide-react';
import type { Match, Pitch, SourceState, TimelineEvent, WidgetPayload } from '../types';
import { formatDateTime, formatTime, safeUrl, statusLabel } from '../lib/utils';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { EmptyState } from './empty-state';

function Team({ team }: { team: Match['home'] }) {
  const [broken, setBroken] = useState(false);
  return <div className="team">
    <div className="team-mark">
      {team.logo && !broken ? <img src={team.logo} alt={`Logo ${team.name}`} width="84" height="84" onError={() => setBroken(true)} /> : <span>{team.code || 'OM'}</span>}
    </div>
    <strong>{team.shortName || team.name || 'À confirmer'}</strong>
    <small>{team.code || '---'}</small>
  </div>;
}

const MatchHero = memo(function MatchHero({ match }: { match: Match }) {
  const hasScore = ['LIVE', 'HALF_TIME', 'FINISHED'].includes(match.status) && Number.isFinite(match.home?.score) && Number.isFinite(match.away?.score);
  const live = match.status === 'LIVE' || match.status === 'HALF_TIME' || match.live;
  const source = safeUrl(match.sourceUrl);
  return <article className={`match-hero status-${match.status.toLowerCase()}`} aria-live="polite">
    <div className="hero-spotlight" aria-hidden="true" />
    <header className="hero-topline">
      <div><span>{match.competitionLabel || match.competition}</span><time>{formatDateTime(match.kickoff)}</time></div>
      <Badge className={live ? 'badge-live' : 'badge-calm'}>{live && <span className="live-dot" />}{statusLabel(match.status)}</Badge>
    </header>
    <div className="matchup">
      <Team team={match.home} />
      <div className="scoreboard">
        {live && <span className="match-minute">{match.minute || 'LIVE'}</span>}
        <strong key={`${match.home?.score}-${match.away?.score}`} className="score-value">{hasScore ? `${match.home.score} - ${match.away.score}` : match.status === 'SCHEDULED' ? 'VS' : '—'}</strong>
        <small>{match.verified ? 'Donnée confirmée' : 'En attente de confirmation'}</small>
      </div>
      <Team team={match.away} />
    </div>
    <footer className="hero-footer">
      <span><MapPin />{match.stadium || 'Stade à confirmer'}</span>
      <span><Activity />{match.event || 'Aucune action confirmée'}</span>
      {source && <a href={source} target="_blank" rel="noreferrer">{match.source || 'Source'}<ExternalLink /></a>}
    </footer>
  </article>;
});

const Timeline = memo(function Timeline({ timeline, live }: { timeline: TimelineEvent[]; live: boolean }) {
  return <Card className="timeline-panel">
    <CardHeader><div><p className="eyebrow">Fil du match</p><h2>Commentaires live</h2></div><Badge className={live ? 'badge-live' : 'badge-calm'}>{live ? 'En direct' : 'Veille'}</Badge></CardHeader>
    <CardContent className="timeline-list">
      {!timeline.length ? <EmptyState title="Aucun événement confirmé" message="Le fil s'activera dès qu'une source publiera une action vérifiée." /> : timeline.map((item) => <article className="timeline-item" key={item.id}><strong>{item.minute || '--'}</strong><div>{item.team && <small>{item.team}</small>}<span>{item.text}</span></div></article>)}
    </CardContent>
  </Card>;
});

const MiniPitch = memo(function MiniPitch({ pitch }: { pitch: Pitch }) {
  return <Card className="pitch-panel">
    <CardHeader><div><p className="eyebrow">Zone live</p><h2>Mini-stade</h2></div><Badge className="badge-calm">{pitch.source || 'Position vérifiée'}</Badge></CardHeader>
    <CardContent>
      <div className="pitch">
        <svg viewBox="0 0 100 64" aria-hidden="true"><rect x="2" y="2" width="96" height="60" rx="2" /><line x1="50" y1="2" x2="50" y2="62" /><circle cx="50" cy="32" r="9" /><rect x="2" y="17" width="16" height="30" /><rect x="82" y="17" width="16" height="30" />{pitch.available && <polyline points={(pitch.path || []).map((p) => `${p.x},${p.y}`).join(' ')} />}</svg>
        {pitch.available && pitch.players.map((player) => <span key={player.id} className={`player-dot ${player.team === 'OM' ? 'is-om' : ''}`} style={{ left: `${player.x}%`, top: `${player.y}%` }} title={player.name} />)}
        {pitch.available && pitch.ball && <span className="ball" style={{ left: `${pitch.ball.x}%`, top: `${pitch.ball.y}%` }} />}
        {!pitch.available && <div className="pitch-empty"><Radio /><strong>Télémétrie indisponible</strong><span>{pitch.message || 'Aucune position ne sera simulée.'}</span></div>}
      </div>
    </CardContent>
  </Card>;
});

const Sources = memo(function Sources({ sources, generatedAt }: { sources: SourceState[]; generatedAt: string }) {
  return <Card className="sources-panel">
    <CardHeader><div><p className="eyebrow">État serveur</p><h2>Sources</h2></div><time>{formatTime(generatedAt)}</time></CardHeader>
    <CardContent className="sources-list">
      {sources.map((source) => <div className="source-row" key={source.name}><span className={`source-icon is-${source.status.toLowerCase()}`}><ShieldCheck /></span><div><strong>{source.name}</strong><small>{source.items} élément{source.items > 1 ? 's' : ''} · cache {source.cache}</small>{source.message && <small>{source.message}</small>}</div><Badge className="badge-calm">{source.status}</Badge></div>)}
    </CardContent>
  </Card>;
});

export function LiveView({ payload }: { payload: WidgetPayload }) {
  const live = payload.hero.status === 'LIVE' || payload.hero.status === 'HALF_TIME' || payload.hero.live;
  return <div className="live-view">
    <div className="live-primary"><MatchHero match={payload.hero} /><Timeline timeline={payload.timeline} live={live} /></div>
    <div className="live-secondary"><MiniPitch pitch={payload.pitch} /><Sources sources={payload.sources} generatedAt={payload.generatedAt} /></div>
    <div className="trust-strip"><span><Trophy /> OM Live Center</span><span><Clock3 /> Prochaine vérification dans {payload.refreshAfterSeconds}s</span><span><ShieldCheck /> Sources affichées, aucune donnée simulée</span></div>
  </div>;
}
