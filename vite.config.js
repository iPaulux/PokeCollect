import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Plugin custom pour servir/copier sql-wasm.wasm
function sqlWasmPlugin() {
  return {
    name: 'sql-wasm',
    configureServer(server) {
      server.middlewares.use('/sql-wasm.wasm', (_req, res) => {
        const wasmPath = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
        res.setHeader('Content-Type', 'application/wasm');
        fs.createReadStream(wasmPath).pipe(res);
      });
    },
    generateBundle() {
      const wasmPath = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
      const source = fs.readFileSync(wasmPath);
      this.emitFile({ type: 'asset', fileName: 'sql-wasm.wasm', source });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    sqlWasmPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'TiploufICON.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'PokéCollect',
        short_name: 'PokéCollect',
        description: 'Gère ta collection de cartes Pokémon',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'TiploufICON.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.pokemontcg\.io\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'pokemon-api', expiration: { maxEntries: 200, maxAgeSeconds: 86400 } },
          },
          {
            urlPattern: /^https:\/\/images\.pokemontcg\.io\//,
            handler: 'CacheFirst',
            options: { cacheName: 'pokemon-images', expiration: { maxEntries: 2000, maxAgeSeconds: 604800 } },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // On inclut sql.js pour que Vite le pré-bundle (CJS→ESM) et expose proprement initSqlJs
    include: ['sql.js'],
  },
  build: {
    target: 'esnext',
  },
});
