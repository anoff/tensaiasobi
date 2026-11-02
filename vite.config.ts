import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const rawHash = process.env.GIT_HASH || 'UNKNOWN'
const gitHash = rawHash !== 'UNKNOWN' ? rawHash.slice(0, 7) : 'UNKNOWN'

/** Print-only build output: the print SVGs (print_*.svg) and the lazily loaded jsPDF/svg2pdf chunks. */
const PRINT_ASSETS = [
  '**/assets/print_*',
  '**/assets/jspdf.es*',
  '**/assets/svg2pdf.es*',
  '**/assets/html2canvas*',
  '**/assets/purify.es*',
  '**/assets/index.es-*',
]
const PRINT_ASSET_RE = /\/assets\/(print_|jspdf\.es|svg2pdf\.es|html2canvas|purify\.es|index\.es-)/

// https://vite.dev/config/
// `vite build --mode ios` builds the bundle for the Capacitor iOS shell (see AppStore.md).
export default defineConfig(({ mode }) => ({
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  plugins: [
    react(),
    VitePWA({
      // WKWebView can't register service workers on capacitor://, and the app ships its files anyway.
      disable: mode === 'ios',
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Printing is a rare grown-up action: keep its art and the PDF libraries out of the install-time
        // precache and cache them on first use instead.
        globIgnores: PRINT_ASSETS,
        runtimeCaching: [
          {
            urlPattern: PRINT_ASSET_RE,
            handler: 'CacheFirst',
            options: { cacheName: 'print-assets', expiration: { maxEntries: 200 } },
          },
        ],
      },
      manifest: {
        name: 'tensaiasobi Kids Games',
        short_name: 'tensaiasobi',
        description: 'Fun and educational tracing and mini-games for kids',
        theme_color: '#ffe7c2',
        background_color: '#ffe7c2',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  base: process.env.VITE_BASE_PATH || './',
  server: {
    host: true,
  },
}))
