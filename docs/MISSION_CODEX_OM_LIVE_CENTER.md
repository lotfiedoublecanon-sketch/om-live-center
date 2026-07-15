# MISSION CODEX — OM LIVE CENTER V2

Créer une nouvelle version séparée `om-live-center`. Le projet Coupe du Monde est terminé : ne plus le modifier directement.

## À garder
Live center, score direct, commentaires live, notifications, calendrier, design mobile/desktop, backend Render, PWA, cache/service worker.

## À remplacer
Données Coupe du Monde, groupes/tableau mondial, affiches CDM, équipes nationales.

## À ajouter
Actus OM, mercato, rumeurs sourcées, officialisations, effectif, prochains matchs, résultats, classement Ligue 1, Europe si OM concerné, blessures/suspendus, vidéos/interviews/conférences.

## Mini-stade
Créer un module original inspiré des trackers live : terrain SVG, ballon, trajectoire pointillée, joueurs avec noms, événement actuel, fallback propre si aucune donnée réelle. Ne pas copier Betclic.

## Performance
News/mercato côté backend, cache news/mercato 5-10 min, cache live 30-60 s, timeout 3-5 s, dernières données valides si source KO, images optimisées, service worker versionné.

## Logo
`web-widget/assets/logo-om-live.svg` est un logo original OM Live Center, pas le logo officiel de l’Olympique de Marseille.

## Étapes
1. Créer branche/projet `om-live-center`.
2. Copier le pack.
3. Brancher `/api/om/widget`.
4. Faire pointer `web-widget/app.js` vers `/api/om/widget`.
5. Tester PC/mobile.
6. Déployer Render avec nouvelle URL.
