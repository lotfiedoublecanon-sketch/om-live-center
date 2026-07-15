# OM Live Center

Application sportive autonome consacree a l'Olympique de Marseille. Elle reunit le match OM actif ou a venir, les commentaires confirmes, les actualites, le mercato source, le calendrier, le classement de Ligue 1 et l'effectif dans une PWA mobile.

Le projet est separe de CDM 2026. Son identite utilise `web-widget/assets/logo-om-live.svg`, un logo original OM Live Center.

## Demarrage

```bash
npm install
npm run build
npm start
```

Ouvrir `http://localhost:3000/om/`.

## Verification

```bash
npm run check
npm run smoke
```

`npm run check` valide les fichiers obligatoires, le build TypeScript et les tests. `npm run smoke` demarre un serveur temporaire, appelle les vraies sources, controle `/health`, `/api/om/widget` et le passage du cache de `MISS` a `HIT`.

## Routes

- `GET /health`
- `GET /api/om/health`
- `GET /api/om/widget`
- `GET /api/om/team-logo/:teamId`
- `GET /om/`

## Sources et fiabilite

- Les matchs, le calendrier, les resultats, le classement et l'effectif utilisent des donnees football structurees cote backend.
- Les actualites et le mercato utilisent des flux RSS Google News qui conservent le nom, l'URL et la date de chaque editeur.
- `OFFICIEL` est reserve aux domaines officiels et a une formulation de confirmation. Une affirmation d'un media reste `RUMEUR` ou `SURVEILLE`.
- Aucun score, joueur, transfert ou evenement de terrain n'est invente.
- Le mini-stade affiche un fallback si la source ne fournit pas de coordonnees verifiees.

## Cache

- live : 45 secondes par defaut;
- calendrier, classement, effectif : 10 minutes;
- actualites et mercato : 7 minutes 30;
- derniere valeur valide renvoyee en `STALE` quand une source echoue.

Les valeurs sont configurables avec `.env.example`. Aucun secret n'est requis et aucun fichier `.env` ne doit etre commite.

## Render

Le fichier `render.yaml` configure :

- build : `npm install --include=dev && npm run build`;
- start : `npm start`;
- health check : `/health`;
- port : `process.env.PORT || 3000`.
