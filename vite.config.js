import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      includePublic: true,
      logStats: true,
      ansiColors: true,
      webp: {
        quality: 80,
        effort: 6,
      },
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
    }),
  ],

  // ─── Dev Server + API Proxy ──────────────────────────────
  // Forwards all /astro-api/* requests to AstrologyAPI.com
  // This means: npm run dev starts EVERYTHING — no separate backend needed
  // Also eliminates any CORS issues in development
  server: {
    port: 5173,
    open: true,            // auto-open browser on start
    proxy: {
      '/astro-api': {
        target: 'https://json.astrologyapi.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/astro-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`[Proxy] ${req.method} ${req.url} → https://json.astrologyapi.com${req.url.replace('/astro-api', '')}`);
          });
          proxy.on('error', (err) => {
            console.error('[Proxy Error]', err.message);
          });
        },
      },
      '/openrouter-api': {
        target: 'https://openrouter.ai/api',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/openrouter-api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[Proxy Error OpenRouter]', err.message);
          });
        },
      },
    },
  },

  // ─── Build config ────────────────────────────────────────
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown requires manualChunks as a function
        manualChunks: (id) => {
          if (id.includes('three') || id.includes('@react-three')) return 'three';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor';
        },
      },
    },
  },
})
