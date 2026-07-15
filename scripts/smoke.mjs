import { spawn } from 'node:child_process';

const port = Number(process.env.OM_SMOKE_PORT) || 4317;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['dist/server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await pause(250);
  }
  throw new Error('Server did not start');
}

try {
  await waitForHealth();
  const first = await fetch(`${base}/api/om/widget`);
  const firstPayload = await first.json();
  const second = await fetch(`${base}/api/om/widget`);
  const secondPayload = await second.json();
  if (!first.ok || !second.ok) throw new Error('Widget endpoint is not HTTP 200');
  if (firstPayload.service !== 'om-live-center' || !firstPayload.hero) throw new Error('Invalid widget contract');
  if (!Array.isArray(firstPayload.news) || !Array.isArray(firstPayload.fixtures)) throw new Error('Missing widget arrays');
  if (firstPayload.hero.status === 'SCHEDULED' && (firstPayload.hero.home?.score !== undefined || firstPayload.hero.away?.score !== undefined)) {
    throw new Error('Scheduled fixture exposes a score');
  }
  console.log(JSON.stringify({
    health: 'OK',
    firstCache: first.headers.get('x-cache'),
    secondCache: second.headers.get('x-cache'),
    hero: `${secondPayload.hero.home?.shortName || 'OM'} - ${secondPayload.hero.away?.shortName || 'TBD'}`,
    status: secondPayload.hero.status,
    news: secondPayload.news.length,
    transfers: secondPayload.transfers.length,
    fixtures: secondPayload.fixtures.length,
    standings: secondPayload.standings.length,
  }, null, 2));
} finally {
  server.kill('SIGTERM');
}
