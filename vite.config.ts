import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'push-service-worker.js',
      injectRegister: 'auto',
      manifest: {
        name: 'Inbox System Management',
        short_name: 'Inbox',
        description: 'Inbox System Management PWA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/Favicon.png',
            sizes: '192x192 512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('\\react\\') || id.includes('\\react-dom\\')) return 'react-core'
              if (id.includes('@mediapipe')) return 'mediapipe-vendor'
              if (id.includes('emoji-picker-react')) return 'emoji-vendor'
              if (id.includes('recharts') || id.includes('d3-')) return 'charts-vendor'
              if (id.includes('@privacyresearch')) return 'crypto-vendor'
              if (id.includes('lucide-react')) return 'icons-vendor'
              if (id.includes('@tanstack')) return 'tanstack-vendor'
              if (id.includes('react-virtuoso')) return 'virtuoso-vendor'
              if (id.includes('i18next')) return 'i18n-vendor'
              return 'vendor'
            }
          }
      }
    }
  }
});