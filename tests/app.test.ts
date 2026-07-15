import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('OM Live Center server', () => {
  it('serves a stable health response', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'om-live-center', version: '1.0.0' });
  });

  it('serves the PWA shell with security headers', async () => {
    const response = await request(app).get('/om/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('OM Live Center');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns a clean JSON 404 for unknown API routes', async () => {
    const response = await request(app).get('/api/unknown');
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Route API inconnue');
  });

  it('rejects arbitrary team-logo proxy targets', async () => {
    const response = await request(app).get('/api/om/team-logo/not-a-team');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Identifiant equipe invalide');
  });

  it('rejects arbitrary player-photo proxy targets', async () => {
    const response = await request(app).get('/api/om/player-photo/not%20a%20player');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Identifiant joueur invalide');
  });
});
