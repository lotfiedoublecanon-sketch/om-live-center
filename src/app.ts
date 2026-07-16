import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { omHealthApi, omWidgetApi } from './om/routes/omWidgetApi.js';
import { getSquadPhotoOrigin } from './om/services/squad.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(currentDir, '..', 'web-widget');
const logoCache = new Map<string, { body: Buffer; contentType: string; expiresAt: number }>();
const playerPhotoCache = new Map<string, { body: Buffer; contentType: string; expiresAt: number }>();

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  app.use(express.json({ limit: '16kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' https://a.espncdn.com data:; style-src 'self'; script-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    next();
  });

  app.get('/health', omHealthApi);
  app.get('/api/om/health', omHealthApi);
  app.get('/api/om/widget', omWidgetApi);
  app.get('/api/om/team-logo/:teamId', async (req, res) => {
    const teamId = req.params.teamId;
    if (!/^\d{1,8}$/.test(teamId)) {
      return res.status(400).json({ status: 'error', message: 'Identifiant equipe invalide' });
    }
    const cached = logoCache.get(teamId);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.status(200).send(cached.body);
    }
    try {
      const upstream = await fetch(`https://a.espncdn.com/i/teamlogos/soccer/500/${teamId}.png`, {
        signal: AbortSignal.timeout(4_500),
      });
      if (!upstream.ok) return res.status(404).end();
      const body = Buffer.from(await upstream.arrayBuffer());
      if (!body.length || body.length > 1_500_000) return res.status(502).end();
      const contentType = upstream.headers.get('content-type') || 'image/png';
      logoCache.set(teamId, { body, contentType, expiresAt: Date.now() + 86_400_000 });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.status(200).send(body);
    } catch {
      return res.status(503).end();
    }
  });

  app.get('/api/om/player-photo/:playerId', async (req, res) => {
    const playerId = req.params.playerId;
    if (!/^[a-z0-9-]{1,80}$/.test(playerId)) {
      return res.status(400).json({ status: 'error', message: 'Identifiant joueur invalide' });
    }
    const cached = playerPhotoCache.get(playerId);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.status(200).send(cached.body);
    }
    try {
      const origin = await getSquadPhotoOrigin(playerId);
      if (!origin) return res.status(404).end();
      const upstream = await fetch(origin, { signal: AbortSignal.timeout(8_000) });
      const contentType = upstream.headers.get('content-type') || '';
      if (!upstream.ok || !contentType.startsWith('image/')) return res.status(502).end();
      const body = Buffer.from(await upstream.arrayBuffer());
      if (!body.length || body.length > 4_000_000) return res.status(502).end();
      playerPhotoCache.set(playerId, { body, contentType, expiresAt: Date.now() + 86_400_000 });
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.status(200).send(body);
    } catch {
      return res.status(503).end();
    }
  });

  app.get('/om/sw.js', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });
  app.use('/om', express.static(webRoot, {
    maxAge: '1h',
    index: 'index.html',
    setHeaders: (res, filePath) => {
      const name = path.basename(filePath);
      if (name === 'index.html' || name === 'manifest.json') {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`) && /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(name)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get(/^\/om(?:\/.*)?$/, (_req, res) => res.sendFile(path.join(webRoot, 'index.html')));
  app.get('/', (_req, res) => res.redirect(302, '/om/'));

  app.use('/api', (_req, res) =>
    res.status(404).json({ status: 'error', message: 'Route API inconnue' }),
  );
  return app;
}

export const app = createApp();
