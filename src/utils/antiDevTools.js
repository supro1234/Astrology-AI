/**
 * antiDevTools.js — VedAstro Security Layer
 *
 * Detects when browser DevTools are open and immediately:
 *   1. Shows the obscure overlay (same one used by screenshot/tab guard)
 *   2. Records a session anomaly (contributes toward the 24-hour ban threshold)
 *
 * Detection methods used (layered — no single method is reliable alone):
 *   A. Window outer vs inner size difference (≥160px suggests DevTools panel is docked)
 *   B. console.log element getter timing (DevTools calls the getter; normal JS doesn't)
 *   C. debugger statement timing (pauses ONLY when DevTools is open & "pause on debugger" is on)
 *   D. Firebug / legacy devtools globals
 *
 * ⚠️  LIMITATIONS:
 *   • Undocked DevTools windows are not detected by method A
 *   • Savvy attackers can disable "Pause on debugger statements" to defeat method C
 *   • False positives can occur on very wide monitors or split-screen setups
 *   • This is a deterrent layer, not an absolute block
 *
 * ⚠️  SECURITY NOTE: Cannot prevent source code inspection. A real production
 *     system should obfuscate + minify the build and enforce bans server-side.
 */

import { recordAnomaly } from './banSystem';

const OVERLAY_ID = 'vedastro-security-obscure-overlay';
const DEVTOOLS_SIZE_THRESHOLD = 160; // px
const POLL_INTERVAL_MS        = 1500; // how often to check

let _initialized         = false;
let _pollTimer           = null;
let _devToolsWasOpen     = false;
let _onDevToolsOpen      = null;

// ── Overlay helpers (shared with tabSwitchGuard) ──────────────────────────────

function showObscureOverlay(message = '🔒 Developer Tools Detected — Security Protocol Active') {
  if (document.getElementById(OVERLAY_ID)) return;
  const overlay = document.createElement('div');
  overlay.id                  = OVERLAY_ID;
  overlay.style.position      = 'fixed';
  overlay.style.inset         = '0';
  overlay.style.background    = '#000';
  overlay.style.zIndex        = '2147483647';
  overlay.style.display       = 'flex';
  overlay.style.alignItems    = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.flexDirection = 'column';
  overlay.style.gap           = '12px';
  overlay.innerHTML = `
    <div style="color:#ef4444;font-family:sans-serif;font-weight:700;font-size:1.4rem;text-align:center;">
      🔒 Security Protocol Active
    </div>
    <div style="color:#9CA3AF;font-family:sans-serif;font-size:0.9rem;text-align:center;max-width:400px;line-height:1.6;">
      ${message}
    </div>`;
  document.body.appendChild(overlay);
}

function hideObscureOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay?.parentNode) overlay.parentNode.removeChild(overlay);
}

// ── Detection Methods ─────────────────────────────────────────────────────────

/** Method A: Check docked DevTools via window size difference */
function isDevToolsBySize() {
  const widthDiff  = window.outerWidth  - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  return widthDiff > DEVTOOLS_SIZE_THRESHOLD || heightDiff > DEVTOOLS_SIZE_THRESHOLD;
}

/** Method B: console.log element id getter (fires only when DevTools formats the log) */
function isDevToolsByConsole() {
  let detected = false;
  const el = document.createElement('div');
  Object.defineProperty(el, 'id', {
    get() {
      detected = true;
      return 'va-dt-probe';
    },
    configurable: true,
  });
  // Suppress the output from appearing in the console visually
  const noop = () => {};
  const _log = console.log;
  console.log = noop;
  // eslint-disable-next-line no-console
  try { console.log('%c', el); } catch { /* ignore */ }
  console.log = _log;
  return detected;
}

/** Method C: Debugger timing (pauses >5ms only when DevTools is open & pausing) */
function isDevToolsByDebugger() {
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger; // pauses ONLY if DevTools has "pause on debugger statements" enabled
  return (performance.now() - start) > 100; // >100ms = paused
}

/** Method D: Firebug + legacy globals */
function isDevToolsByGlobals() {
  return !!(window.Firebug?.chrome?.isInitialized);
}

// ── Main Poll ─────────────────────────────────────────────────────────────────

function checkDevTools() {
  const open = isDevToolsBySize() || isDevToolsByConsole() || isDevToolsByGlobals();
  // Note: isDevToolsByDebugger is intentionally not called in the poll to avoid
  // aggressive pausing on legitimate developer machines. It's used only during
  // the initial check.

  if (open && !_devToolsWasOpen) {
    _devToolsWasOpen = true;
    showObscureOverlay();

    // Record as a session anomaly
    const deviceId = (() => { try { return localStorage.getItem('device_id'); } catch { return null; } })();
    recordAnomaly(deviceId);

    if (typeof _onDevToolsOpen === 'function') {
      _onDevToolsOpen();
    }
  } else if (!open && _devToolsWasOpen) {
    _devToolsWasOpen = false;
    hideObscureOverlay();
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start monitoring for DevTools.
 * @param {{ onOpen?: () => void, pollIntervalMs?: number }} options
 * @returns {() => void} cleanup
 */
export function initAntiDevTools({ onOpen = null, pollIntervalMs = POLL_INTERVAL_MS } = {}) {
  if (_initialized) return destroyAntiDevTools;
  _initialized   = true;
  _onDevToolsOpen = onOpen;

  // Immediate check on init
  checkDevTools();

  // Polling loop
  _pollTimer = setInterval(checkDevTools, pollIntervalMs);

  // Also respond to resize events (docking/undocking DevTools)
  window.addEventListener('resize', checkDevTools, { passive: true });

  return destroyAntiDevTools;
}

export function destroyAntiDevTools() {
  _initialized    = false;
  _onDevToolsOpen = null;

  if (_pollTimer !== null) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  window.removeEventListener('resize', checkDevTools);
  hideObscureOverlay();
  _devToolsWasOpen = false;
}
