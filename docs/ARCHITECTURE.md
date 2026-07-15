# Architecture

Front : `web-widget/` (index, style, app, manifest, sw).
Backend : `src/om/` (routes, adapters, types).
API unique recommandée : `GET /api/om/widget`.
But : moins de requêtes mobile, meilleur cache, fallback simple.
