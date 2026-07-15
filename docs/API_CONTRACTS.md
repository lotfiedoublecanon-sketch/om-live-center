# Contrat API OM

## `GET /api/om/widget`

Reponse HTTP 200 stable :

```json
{
  "service": "om-live-center",
  "version": "1.0.0",
  "generatedAt": "ISO-8601",
  "hero": {},
  "pitch": {},
  "timeline": [],
  "news": [],
  "transfers": [],
  "fixtures": [],
  "results": [],
  "standings": [],
  "squad": [],
  "sources": [],
  "refreshAfterSeconds": 60
}
```

Chaque match porte `source`, `sourceUrl` quand disponible et `verified`. Un match programme n'expose pas de score. Le terrain porte `available: false` tant qu'aucune telemetrie reelle n'existe.

Chaque source porte `status`, `cache`, `items`, `checkedAt` et un message optionnel. L'en-tete `x-cache` vaut `MISS`, `HIT`, `STALE` ou `MIXED`.

Mercato : `OFFICIEL` exige une source officielle et une formulation de confirmation. Les autres statuts sont `RUMEUR` et `SURVEILLE`.
