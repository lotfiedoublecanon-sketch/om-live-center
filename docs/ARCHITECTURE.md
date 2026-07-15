# Architecture

- `src/app.ts` : application Express, securite HTTP, routes et PWA.
- `src/om/adapters/live.ts` : matchs OM, calendrier, classement, effectif et commentaires.
- `src/om/adapters/news.ts` : actualites RSS normalisees et dedoublonnees.
- `src/om/adapters/transfers.ts` : mercato source et classification de fiabilite.
- `src/om/cache/stale-cache.ts` : TTL, requete partagee et derniere valeur valide.
- `src/om/services/` : client HTTP borne et parseur RSS.
- `web-widget/` : application PWA responsive sans framework client.

Le navigateur appelle une seule route globale, `GET /api/om/widget`. Les appels aux fournisseurs restent cote serveur. Le proxy des logos n'accepte que des identifiants numeriques et ne peut pas devenir un proxy d'URL arbitraire.
