import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { storage } from './utils/storage.js'

// ─── One-time cache bust ─────────────────────────────────
// Clears old corrupted cache entries (e.g. API objects stored as values)
// Bump this version string whenever the API response shape changes
const CACHE_VERSION = 'v2';
const storedVersion = localStorage.getItem('vedastro_cache_version');
if (storedVersion !== CACHE_VERSION) {
  storage.clearCache();
  localStorage.setItem('vedastro_cache_version', CACHE_VERSION);
  console.log('[VedAstro] Cache cleared — new version:', CACHE_VERSION);
}

// ─── Apply theme class before first render (prevents flash) ─
const isDark = (() => {
  try {
    const stored = JSON.parse(localStorage.getItem('vedastro_dark'));
    return stored === null || stored === undefined ? true : stored;
  } catch { return true; }
})();
document.documentElement.classList.add(isDark ? 'dark' : 'light');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
