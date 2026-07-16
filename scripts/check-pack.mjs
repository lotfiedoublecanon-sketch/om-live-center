import fs from 'node:fs';

const files = [
  'web-widget/index.html',
  'web-widget/sw.js',
  'web-widget/manifest.json',
  'web-widget/assets/logo-om-live.svg',
  'web-widget/assets/icon-192.png',
  'web-widget/assets/icon-512.png',
  'frontend/index.html',
  'frontend/src/main.tsx',
  'frontend/src/App.tsx',
  'frontend/src/index.css',
  'vite.config.ts',
  'tsconfig.frontend.json',
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
const generatedAssets = fs.existsSync('web-widget/assets')
  ? fs.readdirSync('web-widget/assets')
  : [];
if (!generatedAssets.some((file) => /^index-.*\.js$/.test(file))) missing.push('web-widget/assets/index-*.js');
if (!generatedAssets.some((file) => /^index-.*\.css$/.test(file))) missing.push('web-widget/assets/index-*.css');
if (missing.length) {
  missing.forEach((file) => console.error(`missing ${file}`));
  process.exit(1);
}
console.log(`Pack OK: ${files.length} fichiers obligatoires presents`);
