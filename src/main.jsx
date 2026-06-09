import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary.jsx'
import { storage } from './utils/storage.js'

// ─── Sentry Initialisation ───────────────────────────────────────────────────
// Add your DSN to .env as VITE_SENTRY_DSN to enable error reporting in prod.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  enabled: !!import.meta.env.VITE_SENTRY_DSN,   // only active when DSN is set
  environment: import.meta.env.MODE,              // 'development' | 'production'
  release: import.meta.env.VITE_APP_VERSION || '0.0.0',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance tracing — 10 % of transactions in prod
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Session replay — 10 % of sessions, 100 % on errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// ─── One-time cache bust ─────────────────────────────────────────────────────
const CACHE_VERSION = 'v2';
const storedVersion = localStorage.getItem('vedastro_cache_version');
if (storedVersion !== CACHE_VERSION) {
  storage.clearCache();
  localStorage.setItem('vedastro_cache_version', CACHE_VERSION);
  console.log('[VedAstro] Cache cleared — new version:', CACHE_VERSION);
}

// ─── Apply theme class before first render (prevents flash) ─────────────────
const isDark = (() => {
  try {
    const stored = JSON.parse(localStorage.getItem('vedastro_dark'));
    return stored === null || stored === undefined ? true : stored;
  } catch { return true; }
})();
document.documentElement.classList.add(isDark ? 'dark' : 'light');

// ─── Render ──────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
