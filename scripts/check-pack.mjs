import fs from 'node:fs';

const files = [
  'web-widget/index.html',
  'web-widget/style.css',
  'web-widget/app.js',
  'web-widget/sw.js',
  'web-widget/manifest.json',
  'web-widget/assets/logo-om-live.svg',
  'web-widget/assets/icon-192.png',
  'web-widget/assets/icon-512.png',
  'src/app.ts',
  'src/server.ts',
  'src/om/routes/omWidgetApi.ts',
  'src/om/adapters/live.ts',
  'src/om/adapters/news.ts',
  'src/om/adapters/transfers.ts',
  'docs/MISSION_CODEX_OM_LIVE_CENTER.md',
  'render.yaml',
  '.env.example',
];

const missing = files.filter((file) => !fs.existsSync(file));
if (missing.length) {
  missing.forEach((file) => console.error(`missing ${file}`));
  process.exit(1);
}
console.log(`Pack OK: ${files.length} fichiers obligatoires presents`);
