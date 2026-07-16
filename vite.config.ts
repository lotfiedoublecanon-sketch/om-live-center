import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'frontend'),
  base: '/om/',
  publicDir: path.resolve(import.meta.dirname, 'frontend/public'),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'web-widget'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    cssCodeSplit: true,
  },
});
