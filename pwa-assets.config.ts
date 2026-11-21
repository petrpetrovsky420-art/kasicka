import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Ikony aplikace se generují z public/favicon.svg příkazem `npm run icons`.
// Maskovatelná ikona (Android) a ikona pro iPhone dostanou pozadí v barvě aplikace.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: '#0e5a3a' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.12,
      resizeOptions: { background: '#0e5a3a' },
    },
  },
  images: ['public/favicon.svg'],
});
