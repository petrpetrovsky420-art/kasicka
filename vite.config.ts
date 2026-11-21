import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Na GitHub Pages běží aplikace v podsložce (/kasicka/); workflow nastaví BASE_PATH sám.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Kasička – spořicí cíle',
        short_name: 'Kasička',
        description: 'Spořicí cíle, vklady a přehled, kolik odkládat, aby to vyšlo včas.',
        lang: 'cs',
        dir: 'ltr',
        display: 'standalone',
        theme_color: '#0e5a3a',
        background_color: '#f3f5f0',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Vietnamské znaky čeština nepotřebuje, nemusí se stahovat do offline mezipaměti.
        globIgnores: ['**/*vietnamese*'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
});
