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
              if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'
              if (id.includes('@tanstack/react-query')) return 'tanstack'
              if (id.includes('emoji-picker-react')) return 'emoji'
              if (id.includes('@mediapipe/tasks-vision')) return 'mediapipe'
              return 'vendor'
            }
          }
      }
    }
  }
});