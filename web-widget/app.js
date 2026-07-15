const API_URL = window.OM_API_BASE || '/api/om/widget';
const FALLBACK_URL = './data/mock.json';
const STORAGE_PAYLOAD = 'om-live-center:last-payload';
const STORAGE_SNAPSHOT = 'om-live-center:last-match-snapshot';

const state = {
  payload: null,
  timer: null,
  loading: false,
  deferredInstall: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clear = (element) => { if (element) element.replaceChildren(); };

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function array(value) { return Array.isArray(value) ? value : []; }

function dateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Horaire à confirmer';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function relativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}

function statusLabel(status) {
  return ({
    LIVE: 'EN DIRECT',
    HALF_TIME: 'MI-TEMPS',
    SCHEDULED: 'À VENIR',
    FINISHED: 'TERMINÉ',
    POSTPONED: 'REPORTÉ',
    SUSPENDED: 'SUSPENDU',
    UNAVAILABLE: 'EN ATTENTE',
  })[status] || 'EN ATTENTE';
}

function emptyState(container, title, message) {
  clear(container);
  const block = node('div', 'empty-state');
  block.append(node('strong', '', title), node('span', '', message));
  container?.append(block);
}

function setConnection(mode, label) {
  const element = $('#connectionState');
  if (!element) return;
  element.dataset.state = mode;
  $('#connectionLabel').textContent = label;
}

function setLoading(loading) {
  state.loading = loading;
  $('#loading').hidden = !loading;
  $('#refreshBtn')?.classList.toggle('is-spinning', loading);
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.setTimeout(() => { toast.hidden = true; }, 3_200);
}

function setTeam(prefix, team = {}) {
  const code = typeof team.code === 'string' && team.code ? team.code : '---';
  const name = typeof team.shortName === 'string' && team.shortName
    ? team.shortName
    : typeof team.name === 'string' && team.name
      ? team.name
      : 'À confirmer';
  $(`#${prefix}Code`).textContent = code;
  $(`#${prefix}Name`).textContent = name;
  $(`#${prefix}Fallback`).textContent = code;
  const image = $(`#${prefix}Logo`);
  const fallback = $(`#${prefix}Fallback`);
  const logo = safeHttpUrl(team.logo);
  if (image && logo) {
    image.src = logo;
    image.alt = `Emblème ${name}`;
    image.hidden = false;
    fallback.hidden = true;
    image.onerror = () => { image.hidden = true; fallback.hidden = false; };
  } else if (image) {
    image.hidden = true;
    fallback.hidden = false;
  }
}

function renderHero(hero = {}) {
  const status = hero.status || 'UNAVAILABLE';
  $('#hero').dataset.status = status;
  $('#competition').textContent = hero.competition || 'Olympique de Marseille';
  $('#kickoff').textContent = dateTime(hero.kickoff);
  $('#matchStatus').textContent = statusLabel(status);
  $('#minute').textContent = ['LIVE', 'HALF_TIME'].includes(status) ? hero.minute || '' : '';
  $('#stadium').textContent = hero.stadium || 'À confirmer';
  $('#currentEvent').textContent = hero.event || 'Aucune action confirmée';
  setTeam('home', hero.home);
  setTeam('away', hero.away);

  const hasScore = ['LIVE', 'HALF_TIME', 'FINISHED'].includes(status)
    && Number.isFinite(hero.home?.score)
    && Number.isFinite(hero.away?.score);
  $('#score').textContent = hasScore ? `${hero.home.score} - ${hero.away.score}` : status === 'SCHEDULED' ? 'VS' : '—';

  const link = $('#matchSource');
  const sourceUrl = safeHttpUrl(hero.sourceUrl);
  if (link && sourceUrl) {
    link.href = sourceUrl;
    link.textContent = hero.source || 'Source du match';
    link.hidden = false;
  } else if (link) {
    link.hidden = true;
  }
  $('#timelineIndicator').textContent = ['LIVE', 'HALF_TIME'].includes(status) ? 'En direct' : statusLabel(status);
  $('#timelineIndicator').classList.toggle('is-live', ['LIVE', 'HALF_TIME'].includes(status));
}

function renderPitch(pitch = {}) {
  const playersLayer = $('#playersLayer');
  const ball = $('#ball');
  const path = $('#ballPath');
  const fallback = $('#pitchFallback');
  clear(playersLayer);
  const available = pitch.available === true;
  fallback.hidden = available;
  if (!available) {
    $('strong', fallback).textContent = 'Télémétrie indisponible';
    $('span', fallback).textContent = pitch.message || 'Aucune position n’est affichée sans donnée confirmée.';
  }
  $('#pitchSource').textContent = pitch.source || 'Aucune position source';

  const points = array(pitch.path).filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  path?.setAttribute('points', available ? points.map((point) => `${point.x},${point.y}`).join(' ') : '');

  if (ball && available && Number.isFinite(pitch.ball?.x) && Number.isFinite(pitch.ball?.y)) {
    ball.style.left = `${pitch.ball.x}%`;
    ball.style.top = `${pitch.ball.y}%`;
    ball.hidden = false;
  } else if (ball) {
    ball.hidden = true;
  }

  if (!available) return;
  array(pitch.players).forEach((player) => {
    if (!Number.isFinite(player?.x) || !Number.isFinite(player?.y)) return;
    const dot = node('div', `player-dot ${player.team === 'OM' ? '' : 'is-opponent'}`.trim());
    dot.style.left = `${player.x}%`;
    dot.style.top = `${player.y}%`;
    dot.append(node('span', '', player.name || 'Joueur'));
    playersLayer?.append(dot);
  });
}

function renderTimeline(items) {
  const container = $('#timeline');
  const timeline = array(items);
  if (!timeline.length) {
    emptyState(container, 'Aucun commentaire confirmé', 'Le fil s’activera quand la source du match publiera des événements.');
    return;
  }
  clear(container);
  timeline.forEach((item) => {
    const card = node('article', 'timeline-item');
    card.append(node('strong', 'timeline-item__minute', item.minute || '--'));
    const body = node('div', 'timeline-item__body');
    if (item.team) body.append(node('small', '', item.team));
    body.append(node('span', '', item.text || 'Événement confirmé'));
    card.append(body);
    container.append(card);
  });
}

function contentLink(url) {
  const link = node('a', 'content-card');
  const safeUrl = safeHttpUrl(url);
  if (safeUrl) {
    link.href = safeUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
  } else {
    link.removeAttribute('href');
  }
  return link;
}

function renderNews(items) {
  const container = $('#news');
  const news = array(items);
  $('#newsCount').textContent = `${news.length} article${news.length > 1 ? 's' : ''}`;
  if (!news.length) {
    emptyState(container, 'Aucune actualité disponible', 'Les flux sources seront retentés automatiquement.');
    return;
  }
  clear(container);
  news.forEach((item) => {
    const card = contentLink(item.url);
    const top = node('div', 'content-card__top');
    const tag = node('span', 'content-card__tag', item.tag || 'Actu');
    if (item.official) tag.dataset.kind = 'OFFICIEL';
    top.append(tag, node('time', '', relativeDate(item.publishedAt)));
    card.append(top, node('h2', '', item.title || 'Actualité OM'));
    if (item.summary) card.append(node('p', '', item.summary));
    card.append(node('span', 'content-card__source', item.source || 'Source non renseignée'));
    container.append(card);
  });
}

function renderTransfers(items) {
  const container = $('#transfers');
  const transfers = array(items);
  $('#transferCount').textContent = `${transfers.length} information${transfers.length > 1 ? 's' : ''}`;
  if (!transfers.length) {
    emptyState(container, 'Aucune information mercato', 'Aucun élément sourcé n’est disponible pour le moment.');
    return;
  }
  clear(container);
  transfers.forEach((item) => {
    const card = contentLink(item.url);
    const top = node('div', 'content-card__top');
    const tag = node('span', 'content-card__tag', item.status || 'SURVEILLÉ');
    tag.dataset.kind = item.status || 'SURVEILLE';
    top.append(tag, node('time', '', relativeDate(item.publishedAt)));
    card.append(top, node('h2', '', item.headline || 'Information mercato'));
    card.append(node('span', 'content-card__source', item.source || 'Source non renseignée'));
    const reliability = node('div', 'reliability');
    const bar = node('span');
    bar.style.width = `${Math.max(0, Math.min(100, Number(item.reliability) || 0))}%`;
    reliability.append(bar);
    card.append(reliability);
    container.append(card);
  });
}

function renderMatchList(selector, items, emptyTitle) {
  const container = $(selector);
  const matches = array(items);
  if (!matches.length) {
    emptyState(container, emptyTitle, 'Aucun match confirmé par la source pour le moment.');
    return;
  }
  clear(container);
  matches.forEach((match) => {
    const row = node('article', 'match-row');
    row.append(node('time', '', dateTime(match.kickoff)));
    const teams = node('div', 'match-row__teams');
    teams.append(
      node('strong', '', match.home?.shortName || match.home?.name || 'À confirmer'),
      node('span', '', match.away?.shortName || match.away?.name || 'À confirmer'),
      node('small', '', `${match.competition || 'Compétition'} · ${match.homeAway || ''}`),
    );
    row.append(teams);
    const hasScore = Number.isFinite(match.home?.score) && Number.isFinite(match.away?.score);
    row.append(node('strong', 'match-row__score', hasScore ? `${match.home.score} - ${match.away.score}` : 'VS'));
    container.append(row);
  });
}

function renderStandings(items) {
  const body = $('#standings');
  const empty = $('#standingsEmpty');
  const rows = array(items);
  clear(body);
  clear(empty);
  if (!rows.length) {
    emptyState(empty, 'Classement indisponible', 'La source Ligue 1 sera retentée automatiquement.');
    return;
  }
  rows.forEach((row) => {
    const tr = node('tr', row.isOm ? 'is-om' : '');
    tr.append(node('td', '', String(row.position || '—')));
    const teamCell = node('td');
    const team = node('div', 'standing-team');
    const logo = safeHttpUrl(row.logo);
    if (logo) {
      const image = node('img');
      image.src = logo;
      image.alt = '';
      image.loading = 'lazy';
      image.onerror = () => image.remove();
      team.append(image);
    }
    team.append(node('strong', '', row.team || 'Équipe'));
    teamCell.append(team);
    tr.append(teamCell);
    [row.played, row.won, row.drawn, row.lost, row.goalDifference, row.points].forEach((value) =>
      tr.append(node('td', '', String(Number.isFinite(value) ? value : 0))),
    );
    body.append(tr);
  });
}

function renderSquad(items) {
  const container = $('#squad');
  const squad = array(items);
  $('#squadCount').textContent = `${squad.length} joueur${squad.length > 1 ? 's' : ''}`;
  if (!squad.length) {
    emptyState(container, 'Effectif indisponible', 'Les joueurs seront affichés dès que la source sportive les publiera.');
    return;
  }
  clear(container);
  squad.forEach((player) => {
    const card = node('article', 'player-card');
    const visual = node('div', 'player-card__visual', player.number || 'OM');
    const imageUrl = safeHttpUrl(player.image);
    if (imageUrl) {
      const image = node('img');
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.onerror = () => image.remove();
      visual.replaceChildren(image);
    }
    const copy = node('div', 'player-card__copy');
    copy.append(node('strong', '', player.name || 'Joueur'), node('small', '', `${player.position || 'Poste non renseigné'}${player.nationality ? ` · ${player.nationality}` : ''}`));
    if (array(player.injuries).length) copy.append(node('small', 'injury', player.injuries.join(' · ')));
    card.append(visual, copy);
    container.append(card);
  });
}

function renderSources(items, generatedAt) {
  const container = $('#sourceList');
  const sources = array(items);
  clear(container);
  if (!sources.length) {
    emptyState(container, 'Aucune source joignable', 'Les dernières données locales restent affichées si elles existent.');
  } else {
    sources.forEach((source) => {
      const row = node('div', 'source-row');
      row.append(node('strong', '', source.name || 'Source'));
      const status = node('span', 'source-row__state', source.status || 'ERROR');
      status.dataset.status = source.status || 'ERROR';
      row.append(status, node('small', '', `${source.items || 0} élément${source.items > 1 ? 's' : ''} · cache ${source.cache || 'EMPTY'}`));
      if (source.message) row.append(node('small', '', source.message));
      container.append(row);
    });
  }
  const updated = new Date(generatedAt);
  $('#lastUpdated').textContent = Number.isNaN(updated.getTime())
    ? 'Mise à jour inconnue'
    : `Mis à jour à ${updated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function render(payload) {
  state.payload = payload;
  renderHero(payload.hero);
  renderPitch(payload.pitch);
  renderTimeline(payload.timeline);
  renderNews(payload.news);
  renderTransfers(payload.transfers);
  renderMatchList('#fixtures', payload.fixtures, 'Aucun prochain match');
  renderMatchList('#results', payload.results, 'Aucun résultat disponible');
  $('#fixtureCount').textContent = `${array(payload.fixtures).length} match${array(payload.fixtures).length > 1 ? 's' : ''}`;
  renderStandings(payload.standings);
  renderSquad(payload.squad);
  renderSources(payload.sources, payload.generatedAt);
  notifyOnMatchChange(payload.hero);
}

function readStoredPayload() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PAYLOAD) || 'null'); } catch { return null; }
}

function storePayload(payload) {
  try { localStorage.setItem(STORAGE_PAYLOAD, JSON.stringify(payload)); } catch { /* storage can be disabled */ }
}

async function fetchPayload(url) {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload || typeof payload !== 'object' || !payload.hero) throw new Error('Format serveur invalide');
  return payload;
}

async function refresh({ manual = false } = {}) {
  if (state.loading) return;
  setLoading(true);
  window.clearTimeout(state.timer);
  try {
    const payload = await fetchPayload(API_URL);
    storePayload(payload);
    render(payload);
    const stale = array(payload.sources).some((source) => source.status === 'STALE');
    setConnection(stale ? 'loading' : 'online', stale ? 'Cache serveur' : 'Serveur connecté');
    if (manual) showToast('Données actualisées');
  } catch {
    const stored = readStoredPayload();
    if (stored?.hero) {
      render(stored);
      setConnection('offline', 'Dernières données');
      if (manual) showToast('Serveur indisponible, dernières données affichées');
    } else {
      try {
        const fallback = await fetchPayload(FALLBACK_URL);
        render(fallback);
      } catch {
        render({ hero: {}, pitch: {}, timeline: [], news: [], transfers: [], fixtures: [], results: [], standings: [], squad: [], sources: [], generatedAt: new Date().toISOString() });
      }
      setConnection('offline', 'Hors ligne');
      if (manual) showToast('Serveur temporairement indisponible');
    }
  } finally {
    setLoading(false);
    const seconds = Math.max(30, Math.min(120, Number(state.payload?.refreshAfterSeconds) || 60));
    state.timer = window.setTimeout(() => refresh(), seconds * 1_000);
  }
}

function activateTab(name) {
  $$('.tabs__button').forEach((button) => {
    const active = button.dataset.tab === name;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.view').forEach((view) => {
    const active = view.dataset.view === name;
    view.classList.toggle('is-active', active);
    view.hidden = !active;
  });
  history.replaceState(null, '', `#${name}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    showToast('Notifications non prises en charge sur cet appareil');
    return;
  }
  const permission = await Notification.requestPermission();
  showToast(permission === 'granted' ? 'Notifications activées' : 'Notifications non autorisées');
}

async function notifyOnMatchChange(hero = {}) {
  const snapshot = {
    id: hero.id,
    status: hero.status,
    homeScore: hero.home?.score,
    awayScore: hero.away?.score,
  };
  let previous = null;
  try { previous = JSON.parse(localStorage.getItem(STORAGE_SNAPSHOT) || 'null'); } catch { /* ignore */ }
  try { localStorage.setItem(STORAGE_SNAPSHOT, JSON.stringify(snapshot)); } catch { /* ignore */ }
  if (!previous || Notification.permission !== 'granted') return;
  const isLive = ['LIVE', 'HALF_TIME'].includes(hero.status);
  const scoreChanged = previous.id === hero.id && (previous.homeScore !== snapshot.homeScore || previous.awayScore !== snapshot.awayScore);
  const started = previous.id === hero.id && previous.status !== 'LIVE' && hero.status === 'LIVE';
  if (!isLive || (!scoreChanged && !started)) return;
  const registration = await navigator.serviceWorker?.ready;
  registration?.active?.postMessage({
    type: 'SHOW_NOTIFICATION',
    title: started ? 'Le match de l’OM commence' : 'Score OM actualisé',
    body: `${hero.home?.shortName || 'OM'} ${Number.isFinite(hero.home?.score) ? hero.home.score : ''} - ${Number.isFinite(hero.away?.score) ? hero.away.score : ''} ${hero.away?.shortName || ''}`.trim(),
    matchId: hero.id,
  });
}

$$('.tabs__button').forEach((button) => button.addEventListener('click', () => activateTab(button.dataset.tab)));
$('#refreshBtn')?.addEventListener('click', () => refresh({ manual: true }));
$('#notificationBtn')?.addEventListener('click', enableNotifications);

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstall = event;
  $('#installBtn').hidden = false;
});

$('#installBtn')?.addEventListener('click', async () => {
  if (!state.deferredInstall) return;
  state.deferredInstall.prompt();
  await state.deferredInstall.userChoice;
  state.deferredInstall = null;
  $('#installBtn').hidden = true;
});

window.addEventListener('online', () => refresh());
window.addEventListener('offline', () => setConnection('offline', 'Hors ligne'));

const initialTab = location.hash.slice(1);
if (['live', 'news', 'transfers', 'calendar', 'standings', 'squad'].includes(initialTab)) activateTab(initialTab);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));
}

refresh();
