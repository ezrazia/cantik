import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg', 'apple-touch-icon-180x180.png'],

      manifest: {
        name: 'CANTIK — CAPI BPS Desa Cantik',
        short_name: 'CANTIK',
        description: 'Aplikasi pencacahan survei BPS berbasis web untuk petugas lapangan',
        theme_color: '#863bff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // Precache all static assets from the build
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        
        // Clean old caches on update
        cleanupOutdatedCaches: true,
        
        // Don't fallback on document based (SPA) navigations
        // This allows to work offline with SPA routing
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],

        runtimeCaching: [
          // ─── API GET: Form structure & Wilayah (StaleWhileRevalidate) ───
          {
            urlPattern: /\/api\/(form|wilayah)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-reference-data',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ─── API GET: Kegiatan & Petugas list (NetworkFirst) ───
          {
            urlPattern: /\/api\/(kegiatan|petugas|dashboard|desa)\b/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dynamic-data',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
          // ─── API GET: Dokumen data (NetworkFirst) ───
          {
            urlPattern: /\/api\/dokumen\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dokumen',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 3, // 3 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5,
            },
          },
          // ─── Google Fonts (CacheFirst) ───
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  // ─── TAMBAHKAN KONFIGURASI SERVER DI SINI ───
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.bpsktt.com'], // Mengizinkan semua subdomain di bawah domain utama Anda
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      }
    }
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.bpsktt.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true,
      }
    }
  }
})