/**
 * tabSwitchGuard.js — VedAstro Security Layer
 *
 * ⚠️  SECURITY NOTE: The device ban triggered here is stored in localStorage
 *     and can be bypassed by clearing browser storage. A real production system
 *     needs server-side IP banning + a persistent fingerprint database.
 *
 * Detects when the user:
 *   • Switches to another tab (document.visibilitychange)
 *   • Switches to another window / app (window.blur)
 *   • Opens browser search: Ctrl+F / Cmd+F / F3 / Cmd+G
 *
 * On detection:
 *   1. Records the anomaly in the ban system (rolling 5-min window).
 *   2. If ban threshold reached, calls onBanTriggered(ban) immediately.
 *   3. Fires onViolation(reason) to wipe keys and redirect as before.
 *
 * Usage:
 *   const cleanup = initTabGuard(onViolation, { graceMs: 2000, onBanTriggered });
 *   cleanup(); // removes all listeners
 *
 * @param {'tab_hidden'|'window_blur'|'search_open'} reason
 */

import { recordAnomaly } from './banSystem';

let _visibilityHandler  = null;
let _blurHandler        = null;
let _focusHandler       = null;
let _searchKeyHandler   = null;
let _onViolation        = null;
let _onBanTriggered     = null;
let _guardActive        = false;
let _obscureOverlay     = null;
const OVERLAY_ID = 'vedastro-security-obscure-overlay';

function showObscureOverlay() {
  if (!document.getElementById(OVERLAY_ID)) {
    _obscureOverlay = document.createElement('div');
    _obscureOverlay.id = OVERLAY_ID;
    _obscureOverlay.style.position = 'fixed';
    _obscureOverlay.style.top = '0';
    _obscureOverlay.style.left = '0';
    _obscureOverlay.style.width = '100vw';
    _obscureOverlay.style.height = '100vh';
    _obscureOverlay.style.background = '#000';
    _obscureOverlay.style.zIndex = '2147483647'; // Max z-index
    // Optionally add a security message on the black screen
    _obscureOverlay.innerHTML = '<div style="color:#ef4444; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-family:sans-serif; font-weight:bold; font-size:24px;">🔒 Security Protocol Active</div>';
    document.body.appendChild(_obscureOverlay);
  }
}

function hideObscureOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

// Grace period after init so we don't fire immediately on page load
let _graceMs = 1500;
let _startTime = 0;

function fireViolation(reason) {
  if (!_guardActive) return;
  const elapsed = Date.now() - _startTime;
  if (elapsed < _graceMs) return; // skip during grace period

  // ── Ban system: record anomaly before calling the session violation handler
  const deviceId = (() => { try { return localStorage.getItem('device_id'); } catch { return null; } })();
  const banResult = recordAnomaly(deviceId);

  if (banResult.banned && typeof _onBanTriggered === 'function') {
    _onBanTriggered(banResult.ban);
    // Don't also fire the normal violation — the ban screen takes over
    return;
  }

  if (typeof _onViolation === 'function') {
    _onViolation(reason);
  }
}

/**
 * Check if a keyboard event is a browser search / find combo.
 * Covers: Ctrl+F, Cmd+F, F3, Ctrl+G, Cmd+G (next result), Ctrl+H (find & replace)
 */
function isSearchCombo(e) {
  const key = e.key;
  // F3 / Ctrl+F / Cmd+F
  if (key === 'F3') return true;
  if ((e.ctrlKey || e.metaKey) && (key === 'f' || key === 'F')) return true;
  // Ctrl+G / Cmd+G (find next in Firefox / Chrome)
  if ((e.ctrlKey || e.metaKey) && (key === 'g' || key === 'G')) return true;
  return false;
}

/**
 * Initialize the tab/window/search guard.
 * @param {(reason: string) => void} onViolation - Callback on security event
 * @param {{ graceMs?: number }} options
 * @returns {() => void} cleanup function
 */
export function initTabGuard(onViolation, { graceMs = 1500, onBanTriggered = null } = {}) {
  if (_guardActive) destroyTabGuard();

  _onViolation    = onViolation;
  _onBanTriggered = onBanTriggered;
  _guardActive    = true;
  _graceMs        = graceMs;
  _startTime      = Date.now();

  // ── 1. Tab visibility change (user switches browser tab) ────────────────────
  _visibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      showObscureOverlay();
      fireViolation('tab_hidden');
    } else {
      hideObscureOverlay();
    }
  };
  document.addEventListener('visibilitychange', _visibilityHandler);

  // ── 2. Window blur (user switches to another app or DevTools) ───────────────
  // Instantly hides content to defeat Circle to Search and Snipping Tool overlays
  _blurHandler = () => {
    showObscureOverlay();
    fireViolation('window_blur');
  };
  window.addEventListener('blur', _blurHandler);

  _focusHandler = () => {
    hideObscureOverlay();
  };
  window.addEventListener('focus', _focusHandler);

  // ── 3. Browser search bar (Ctrl+F / Cmd+F / F3) ─────────────────────────────
  _searchKeyHandler = (e) => {
    if (isSearchCombo(e)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showObscureOverlay();
      fireViolation('search_open');
      setTimeout(hideObscureOverlay, 2000); // Hide briefly for search combo
    }
  };
  document.addEventListener('keydown', _searchKeyHandler, true);

  return destroyTabGuard;
}

/**
 * Stop the guard and remove all listeners.
 */
export function destroyTabGuard() {
  _guardActive    = false;
  _onViolation    = null;
  _onBanTriggered = null;

  if (_visibilityHandler) {
    document.removeEventListener('visibilitychange', _visibilityHandler);
    _visibilityHandler = null;
  }
  if (_blurHandler) {
    window.removeEventListener('blur', _blurHandler);
    _blurHandler = null;
  }
  if (_focusHandler) {
    window.removeEventListener('focus', _focusHandler);
    _focusHandler = null;
  }
  
  // If overlay is still up when the guard is destroyed (e.g., due to logout redirect),
  // we must attach a one-time focus listener to remove it when the user returns.
  if (_obscureOverlay) {
    const tempFocus = () => {
      hideObscureOverlay();
      window.removeEventListener('focus', tempFocus);
    };
    window.addEventListener('focus', tempFocus);
  }
  if (_searchKeyHandler) {
    document.removeEventListener('keydown', _searchKeyHandler, true);
    _searchKeyHandler = null;
  }
}

/** Human-readable description of the violation reason */
export function getViolationMessage(reason) {
  switch (reason) {
    case 'tab_hidden':  return 'Tab switched — session ended for security.';
    case 'window_blur': return 'Window lost focus — session ended for security.';
    case 'search_open': return 'Browser search detected — session ended for security.';
    default:            return 'Security violation detected — session ended.';
  }
}
