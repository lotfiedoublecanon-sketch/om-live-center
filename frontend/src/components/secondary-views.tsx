import { useState } from 'react';
import { CalendarDays, ExternalLink, ShieldAlert, UserRound } from 'lucide-react';
import type { Match, SquadMember, TabId, WidgetPayload } from '../types';
import { formatDateTime, initials, relativeDate, safeUrl } from '../lib/utils';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { EmptyState } from './empty-state';

function PageHeading({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><span>{meta}</span></header>;
}

function SafeContentLink({ url, children }: { url?: string; children: React.ReactNode }) {
  const href = safeUrl(url);
  return href ? <a className="content-card" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink className="card-link-icon" aria-hidden="true" /></a> : <article className="content-card">{children}</article>;
}

function News({ payload }: { payload: WidgetPayload }) {
  return <div><PageHeading eyebrow="Olympique de Marseille" title="Actualités" meta={`${payload.news.length} article${payload.news.length > 1 ? 's' : ''}`} />
    {!payload.news.length ? <EmptyState title="Aucune actualité disponible" message="Les flux seront retentés automatiquement, sans effacer la dernière donnée valide." /> : <div className="content-grid">{payload.news.map((item) => <SafeContentLink key={item.id} url={item.url}><div className="content-meta"><Badge className={item.official ? 'badge-official' : 'badge-calm'}>{item.tag || 'Actu'}</Badge><time>{relativeDate(item.publishedAt)}</time></div><h2>{item.title}</h2>{item.summary && <p>{item.summary}</p>}<span className="content-source">{item.source}</span></SafeContentLink>)}</div>}
  </div>;
}

function Transfers({ payload }: { payload: WidgetPayload }) {
  return <div><PageHeading eyebrow="Informations sourcées" title="Mercato" meta={`${payload.transfers.length} information${payload.transfers.length > 1 ? 's' : ''}`} />
    <div className="legend"><Badge className="badge-official">Officiel</Badge><Badge className="badge-rumour">Rumeur</Badge><Badge className="badge-calm">Surveillé</Badge></div>
    {!payload.transfers.length ? <EmptyState title="Aucune information mercato" message="Aucun élément sourcé n'est disponible pour le moment." /> : <div className="content-grid">{payload.transfers.map((item) => <SafeContentLink key={item.id} url={item.url}><div className="content-meta"><Badge className={item.status === 'OFFICIEL' ? 'badge-official' : item.status === 'RUMEUR' ? 'badge-rumour' : 'badge-calm'}>{item.status}</Badge><time>{relativeDate(item.publishedAt)}</time></div><h2>{item.headline}</h2><span className="content-source">{item.source}</span><div className="reliability" aria-label={`Fiabilité ${item.reliability} sur 100`}><span style={{ width: `${Math.max(0, Math.min(100, item.reliability))}%` }} /></div></SafeContentLink>)}</div>}
  </div>;
}

function TeamName({ match, side }: { match: Match; side: 'home' | 'away' }) {
  const team = match[side];
  return <span>{team.logo && <img src={team.logo} alt="" width="26" height="26" loading="lazy" />}{team.shortName || team.name || 'À confirmer'}</span>;
}

function MatchList({ items, empty, result = false }: { items: Match[]; empty: string; result?: boolean }) {
  if (!items.length) return <EmptyState title={empty} message="Aucun match confirmé par les sources pour le moment." />;
  return <div className="match-list">{items.map((match) => {
    const score = Number.isFinite(match.home.score) && Number.isFinite(match.away.score) ? `${match.home.score} - ${match.away.score}` : 'VS';
    return <article className="match-row" key={match.id}><time>{formatDateTime(match.kickoff)}</time><div className="match-teams"><TeamName match={match} side="home" /><TeamName match={match} side="away" /><small>{match.competitionLabel || match.competition}{match.competitionType === 'FRIENDLY' ? ' · Match amical' : ''}</small></div><strong>{result ? score : match.status === 'FINISHED' ? score : 'VS'}</strong></article>;
  })}</div>;
}

function Calendar({ payload }: { payload: WidgetPayload }) {
  return <div><PageHeading eyebrow="Toutes compétitions" title="Calendrier OM" meta={`${payload.fixtures.length} match${payload.fixtures.length > 1 ? 's' : ''}`} /><div className="calendar-layout"><Card className="list-panel"><h2><CalendarDays /> À venir</h2><MatchList items={payload.fixtures} empty="Aucun prochain match" /></Card><Card className="list-panel"><h2>Résultats</h2><MatchList items={payload.results} empty="Aucun résultat disponible" result /></Card></div></div>;
}

function Standings({ payload }: { payload: WidgetPayload }) {
  return <div><PageHeading eyebrow="Ligue 1" title="Classement" meta="Saison en cours" />{!payload.standings.length ? <EmptyState title="Classement indisponible" message="La source Ligue 1 sera retentée automatiquement." /> : <Card className="table-panel"><div className="table-scroll"><table><thead><tr><th>#</th><th>Club</th><th>MJ</th><th>G</th><th>N</th><th>P</th><th>Diff.</th><th>Pts</th></tr></thead><tbody>{payload.standings.map((row) => <tr key={row.teamId || row.team} className={row.isOm ? 'is-om' : ''}><td>{row.position}</td><td><span className="standing-team">{row.logo && <img src={row.logo} alt="" width="28" height="28" loading="lazy" />}<strong>{row.team}</strong></span></td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalDifference}</td><td><strong>{row.points}</strong></td></tr>)}</tbody></table></div></Card>}</div>;
}

function PlayerCard({ player }: { player: SquadMember }) {
  const [broken, setBroken] = useState(false);
  const photo = safeUrl(player.photo || player.image);
  return <article className="player-card"><div className="player-visual"><span>{initials(player.name)}</span>{photo && !broken && <img src={photo} alt={`Portrait de ${player.name}`} width="260" height="300" loading="lazy" decoding="async" onError={() => setBroken(true)} />}{player.number && <b>{player.number}</b>}</div><div className="player-copy"><strong>{player.name}</strong><small>{player.position}{player.nationality ? ` · ${player.nationality}` : ''}</small>{player.status && <Badge className="badge-rumour">{player.status}</Badge>}{player.injuries?.length > 0 && <span className="player-alert"><ShieldAlert />{player.injuries.join(' · ')}</span>}<span>{player.source}</span></div></article>;
}

function Squad({ payload }: { payload: WidgetPayload }) {
  const groups: Array<[SquadMember['position'], string]> = [['Gardien', 'Gardiens'], ['Défenseur', 'Défenseurs'], ['Milieu', 'Milieux'], ['Attaquant', 'Attaquants']];
  const latest = payload.squad.map((p) => new Date(p.updatedAt)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => b.getTime() - a.getTime())[0];
  return <div><PageHeading eyebrow="Équipe première" title="Effectif" meta={`${payload.squad.length} joueurs · ${latest ? `mis à jour le ${latest.toLocaleDateString('fr-FR')}` : 'mise à jour inconnue'}`} />{!payload.squad.length ? <EmptyState title="Effectif indisponible" message="La dernière liste valide sera réaffichée dès qu'elle sera disponible." /> : <div className="squad-groups">{groups.map(([position, title]) => {
    const players = payload.squad.filter((player) => player.position === position || (position === 'Défenseur' && player.position === ('DÃ©fenseur' as SquadMember['position'])));
    if (!players.length) return null;
    return <section className="squad-group" key={position}><header><div><UserRound /><h2>{title}</h2></div><Badge className="badge-calm">{players.length}</Badge></header><div className="squad-grid">{players.map((player) => <PlayerCard player={player} key={player.id} />)}</div></section>;
  })}</div>}</div>;
}

export default function SecondaryView({ tab, payload }: { tab: Exclude<TabId, 'live'>; payload: WidgetPayload }) {
  if (tab === 'news') return <News payload={payload} />;
  if (tab === 'transfers') return <Transfers payload={payload} />;
  if (tab === 'calendar') return <Calendar payload={payload} />;
  if (tab === 'standings') return <Standings payload={payload} />;
  return <Squad payload={payload} />;
}
