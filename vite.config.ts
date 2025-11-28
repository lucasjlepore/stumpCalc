import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(() => ({
  // Served at project pages path
  base: '/forestcitystumpworks/',
  plugins: [
    react(),
    VitePWA({
      disable: false,
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      minify: false,
      workbox: {
        mode: 'development',
      },
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Forest City Stump Works',
        short_name: 'Forest City',
        description: 'Offline stump grinding quoting app for Forest City Stump Works',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
}))
