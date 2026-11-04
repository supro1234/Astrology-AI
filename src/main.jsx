import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary.jsx'
import { storage } from './utils/storage.js'
import { checkBan } from './utils/banSystem.js'
import { initSecurityShield } from './utils/securityGuard.js'

// Initialize DevTools security & tamper shield
initSecurityShield()

// ─── Suppress known harmless console warnings ────────────────────────────────
// THREE.Clock was deprecated in r167+ but @react-three/fiber still uses it
// internally. Suppress only that specific message — all other warnings pass through.
;(() => {
  const _warn = console.warn.bind(console);
  console.warn = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    // Suppress THREE.Clock deprecation noise from @react-three/fiber internals
    if (msg.includes('THREE.Clock') && msg.includes('deprecated')) return;
    _warn(...args);
  };
})();

// ─── Dev mode: auto-clear any stale ban left from testing ───────────────────
// When running on localhost / Vite dev server, any stored ban is wiped on
// every page load so the developer is NEVER blocked by their own ban system.
;(() => {
  const isDev =
    import.meta.env.DEV ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname.endsWith('.local');

  if (!isDev) return;

  // ── 1. Wipe ALL ban-related localStorage keys ────────────────────────────
  try {
    localStorage.removeItem('device_ban');
    localStorage.removeItem('sec_anomalies');
    localStorage.removeItem('sec_clean_session_start');
    // Also wipe any sessionStorage copies
    sessionStorage.removeItem('device_ban');
  } catch { /* ignore */ }

  // ── 2. Wipe IndexedDB ban record (vedastro_security DB) ─────────────────
  const clearIDB = (dbName, storeName, key) => {
    try {
      const req = indexedDB.open(dbName);
      req.onsuccess = (e) => {
        try {
          const db = e.target.result;
          if (db.objectStoreNames.contains(storeName)) {
            db.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
          }
        } catch { /* ignore */ }
      };
    } catch { /* ignore */ }
  };
  clearIDB('vedastro_security', 'ban_records', 'device_ban');

  // ── 3. Un-register the security Service Worker so it can't re-inject bans ─
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => {
        if (reg.scope.includes(location.origin)) {
          // Only unregister the security SW, not all SWs
          reg.active?.scriptURL?.includes('security-sw') && reg.unregister();
        }
      });
    }).catch(() => {});
  }

  console.info('%c[VedAstro Dev] Ban system disabled on localhost. You are never blocked.', 'color:#00E575;font-weight:600');
})();

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
const CACHE_VERSION = 'v3';
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

// ─── Synchronous ban check — prevents any flash of app on banned devices ─────
// ⚠️ NOTE: localStorage bans can be bypassed by clearing storage.
// A real production enforcement system needs server-side IP banning.
(() => {
  try {
    const { isBanned } = checkBan();
    if (isBanned) {
      // Paint a matching dark screen immediately — React will hydrate BanScreen on top
      const root = document.getElementById('root');
      if (root) {
        root.style.background = '#0A0A1A';
        root.style.display = 'flex';
        root.style.alignItems = 'center';
        root.style.justifyContent = 'center';
        root.style.minHeight = '100vh';
        root.innerHTML =
          '<div style="color:#ef4444;font-family:Inter,sans-serif;font-size:1rem;opacity:0.5;">' +
          '🔒 Verifying device…</div>';
      }
    }
  } catch { /* ignore — React will handle it */ }
})();

// ─── Register Security Service Worker as early as possible ─────────────────────
// The SW stores the ban in CacheStorage which survives localStorage.clear().
// Registering here (before React) means it will be active on the NEXT page load
// and can intercept navigation requests before any JS executes.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/security-sw.js', { scope: '/' }).catch(() => {
      // SW registration failures are non-fatal — React will still enforce the ban
    });
  });
}

// ─── Render ──────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
