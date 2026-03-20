import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const normalizeBasePath = (value: string) => {
  const trimmed = value.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

export default defineConfig(() => {
  const base = normalizeBasePath(process.env.VITE_BASE_PATH ?? '/')

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          navigateFallback: `${base}index.html`,
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'Phi-3 Mini – Local AI',
          short_name: 'Phi-3',
          description: 'Offline-first local AI assistant powered by Phi-3 Mini',
          theme_color: '#0A0A0F',
          background_color: '#0A0A0F',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: base,
          start_url: base,
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
  }
})
