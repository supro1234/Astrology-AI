/**
 * antiDevTools.js — VedAstro Security Layer
 *
 * ⚠️  PRODUCTION ONLY — completely disabled in development mode.
 *     When running via `pnpm dev` / localhost the developer is never affected.
 *
 * In production: detects DevTools open → issues a 30-minute ban immediately.
 * The ban persists even after DevTools is closed — the visitor must wait.
 *
 * Detection methods (layered):
 *   A. Window outer vs inner size ≥160 px  (docked DevTools panel)
 *   B. console.log element id getter trick  (any open DevTools)
 *   D. Firebug / legacy devtools globals
 */

import { issueBan, BAN_KEYS } from './banSystem';

// ── Guard: skip entirely in development ───────────────────────────────────────
const IS_DEV =
  import.meta.env.DEV ||                        // Vite dev server
  location.hostname === 'localhost' ||           // localhost
  location.hostname === '127.0.0.1' ||           // loopback
  location.hostname.endsWith('.local');          // LAN dev hosts

const OVERLAY_ID              = 'vedastro-security-obscure-overlay';
const DEVTOOLS_SIZE_THRESHOLD = 160;
const POLL_INTERVAL_MS        = 1500;

let _initialized     = false;
let _pollTimer       = null;
let _devToolsWasOpen = false;
let _onDetected      = null;

// ── Overlay ───────────────────────────────────────────────────────────────────

function showBanOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const el = document.createElement('div');
  el.id           = OVERLAY_ID;
  el.style.cssText =
    'position:fixed;inset:0;background:#000;z-index:2147483647;' +
    'display:flex;align-items:center;justify-content:center;' +
    'flex-direction:column;gap:12px;';
  el.innerHTML = `
    <div style="color:#ef4444;font-family:sans-serif;font-weight:700;font-size:1.4rem;text-align:center;">
      🔒 Access Suspended
    </div>
    <div style="color:#9CA3AF;font-family:sans-serif;font-size:0.9rem;text-align:center;max-width:380px;line-height:1.7;">
      Developer Tools detected.<br/>
      This device has been suspended for
      <span style="color:#fca5a5;font-weight:600;">30 minutes</span>.
    </div>`;
  document.body.appendChild(el);
}

// ── Detection ─────────────────────────────────────────────────────────────────

function isDevToolsBySize() {
  const dw = window.outerWidth  - window.innerWidth;
  const dh = window.outerHeight - window.innerHeight;
  return dw > DEVTOOLS_SIZE_THRESHOLD || dh > DEVTOOLS_SIZE_THRESHOLD;
}

function isDevToolsByConsole() {
  let detected = false;
  const probe = document.createElement('div');
  Object.defineProperty(probe, 'id', {
    get() { detected = true; return 'va-dt-probe'; },
    configurable: true,
  });
  const orig = console.log;
  console.log = () => {};
  try { orig.call(console, '%c', probe); } catch { /* ignore */ }
  console.log = orig;
  return detected;
}

function isDevToolsByGlobals() {
  return !!(window.Firebug?.chrome?.isInitialized);
}

// ── Core Poll ─────────────────────────────────────────────────────────────────

function checkDevTools() {
  const open = isDevToolsBySize() || isDevToolsByConsole() || isDevToolsByGlobals();

  if (open && !_devToolsWasOpen) {
    _devToolsWasOpen = true;
    showBanOverlay();

    const deviceId = (() => {
      try { return localStorage.getItem(BAN_KEYS.DEVICE_ID) || 'unknown'; }
      catch { return 'unknown'; }
    })();

    const ban = issueBan(deviceId);

    if (typeof _onDetected === 'function') _onDetected(ban);
  }
  // Ban persists after DevTools closes — BanScreen handles the countdown.
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start DevTools monitoring (production only — no-op in dev).
 * @param {{ onDetected?: (ban: object) => void, pollIntervalMs?: number }} opts
 * @returns {() => void} cleanup
 */
export function initAntiDevTools({
  onDetected     = null,
  pollIntervalMs = POLL_INTERVAL_MS,
} = {}) {
  // ✅ Developer mode — never ban yourself
  if (IS_DEV) {
    console.info(
      '%c[VedAstro] DevTools detection disabled in development mode.',
      'color:#10b981;font-weight:600'
    );
    return () => {}; // no-op cleanup
  }

  if (_initialized) return destroyAntiDevTools;
  _initialized = true;
  _onDetected  = onDetected;

  checkDevTools();
  _pollTimer = setInterval(checkDevTools, pollIntervalMs);
  window.addEventListener('resize', checkDevTools, { passive: true });

  return destroyAntiDevTools;
}

export function destroyAntiDevTools() {
  _initialized = false;
  _onDetected  = null;
  if (_pollTimer !== null) { clearInterval(_pollTimer); _pollTimer = null; }
  window.removeEventListener('resize', checkDevTools);
  _devToolsWasOpen = false;
}

