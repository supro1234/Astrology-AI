import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import loginHandler from './api/admin/login.js'
import verifyHandler from './api/admin/verify.js'
import logoutHandler from './api/admin/logout.js'

function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/admin/login') {
          return loginHandler(req, res);
        }
        if (url === '/api/admin/verify') {
          return verifyHandler(req, res);
        }
        if (url === '/api/admin/logout') {
          return logoutHandler(req, res);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    vercelApiDevPlugin(),
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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false, // removes all source comments and annotations
      },
    },
    rollupOptions: {
      output: {
        // Completely opaque 16-character cryptographic hashes for chunk names:
        // No human-readable component or file names (Admin, Chat, DB, etc.) are exposed!
        entryFileNames: 'assets/[hash:16].js',
        chunkFileNames: 'assets/[hash:16].js',
        assetFileNames: 'assets/[hash:16][extname]',
      },
    },
  },
})
