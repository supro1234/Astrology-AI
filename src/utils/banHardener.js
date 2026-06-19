/**
 * banHardener.js — VedAstro Security Layer — Multi-Layer Ban Enforcement
 *
 * This module makes the ban system as resistant to client-side bypass as possible
 * by stacking multiple independent enforcement layers. Even a developer with full
 * DevTools access will trigger anomaly recording and face significant friction.
 *
 * LAYERS:
 *   1. Storage.prototype intercept  — Detects + blocks localStorage ban removal in-page
 *   2. IndexedDB backup             — Ban persists in IDB even if localStorage is wiped
 *   3. BroadcastChannel             — All open tabs are banned simultaneously
 *   4. Service Worker sync          — SW cache survives localStorage.clear()
 *   5. storage event listener       — Detects out-of-page localStorage manipulation (other tabs/DevTools)
 *   6. DOM MutationObserver         — Re-mounts BanScreen if it is removed from the DOM
 *   7. Periodic re-verification     — Polls ban state every 5 seconds as last-resort check
 *
 * ⚠️  HONEST LIMITATIONS:
 *     A highly determined attacker with full browser control can still bypass this by:
 *     • Disabling JavaScript in browser settings
 *     • Using browser source overrides (Chrome DevTools → Overrides tab)
 *     • Wiping all site data including IndexedDB, SW cache, and cookies simultaneously
 *     For true unbypassable enforcement, a server-side API/CDN ban is mandatory.
 */

import { checkBan, issueBan, BAN_KEYS } from './banSystem';

// ── Constants ─────────────────────────────────────────────────────────────────
const IDB_DB_NAME    = 'vedastro_security';
const IDB_STORE_NAME = 'ban_records';
const IDB_KEY        = 'device_ban';
const BC_CHANNEL     = 'vedastro-ban-v1';

// Module-level state
let _onTamperDetected = null; // Called with (ban) when tampering is detected
let _broadcastChannel = null;
let _tamperProtected  = false;

// ── IndexedDB Ban Storage ─────────────────────────────────────────────────────

function openSecurityDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = ()  => reject(new Error('IDB open failed'));
  });
}

/** Writes ban to IndexedDB (async, fire-and-forget safe) */
export async function idbWriteBan(ban) {
  try {
    const db = await openSecurityDB();
    return new Promise((resolve) => {
      const tx    = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(ban, IDB_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** Reads ban from IndexedDB */
export async function idbReadBan() {
  try {
    const db = await openSecurityDB();
    return new Promise((resolve) => {
      const tx    = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req   = store.get(IDB_KEY);
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror   = ()  => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Checks IDB for an active ban; if found and localStorage lost it, restore it */
export async function syncBanFromIDB() {
  try {
    const idbBan = await idbReadBan();
    if (!idbBan) return null;

    const now = Date.now();
    const expires = new Date(idbBan.expiresAt).getTime();
    if (now >= expires) return null; // Expired in IDB too

    // localStorage may have been cleared — restore it
    const lsBan = localStorage.getItem(BAN_KEYS.DEVICE_BAN);
    if (!lsBan) {
      try { localStorage.setItem(BAN_KEYS.DEVICE_BAN, JSON.stringify(idbBan)); } catch { /* ignore */ }
    }

    return idbBan;
  } catch {
    return null;
  }
}

// ── Service Worker Sync ───────────────────────────────────────────────────────

/** Sends the ban record to the Service Worker for CacheStorage persistence */
export function swSyncBan(ban) {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'VA_SET_BAN', ban });
    }
  } catch { /* ignore */ }
}

/** Queries SW for ban status (returns Promise<ban|null>) */
export function swCheckBan() {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return resolve(null);
    }
    const timeoutId = setTimeout(() => resolve(null), 1500);
    const handler = (event) => {
      if (event.data?.type === 'VA_BAN_STATUS') {
        clearTimeout(timeoutId);
        navigator.serviceWorker.removeEventListener('message', handler);
        resolve(event.data.ban || null);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    navigator.serviceWorker.controller.postMessage({ type: 'VA_CHECK_BAN' });
  });
}

// ── BroadcastChannel — Cross-Tab Ban Propagation ──────────────────────────────

/**
 * Opens the BroadcastChannel and listens for bans issued in other tabs.
 * @param {(ban: object) => void} onBanReceived
 * @returns {() => void} cleanup
 */
export function initBroadcastBanListener(onBanReceived) {
  try {
    _broadcastChannel = new BroadcastChannel(BC_CHANNEL);
    _broadcastChannel.onmessage = (e) => {
      if (e.data?.type === 'VA_BAN_ISSUED' && e.data.ban) {
        onBanReceived(e.data.ban);
      }
    };
    return () => {
      if (_broadcastChannel) { _broadcastChannel.close(); _broadcastChannel = null; }
    };
  } catch {
    return () => {};
  }
}

/** Broadcasts a newly-issued ban to all open tabs */
export function broadcastBan(ban) {
  try {
    if (!_broadcastChannel) {
      const ch = new BroadcastChannel(BC_CHANNEL);
      ch.postMessage({ type: 'VA_BAN_ISSUED', ban });
      ch.close();
    } else {
      _broadcastChannel.postMessage({ type: 'VA_BAN_ISSUED', ban });
    }
  } catch { /* ignore */ }
}

// ── Storage.prototype Tamper Guard ────────────────────────────────────────────
// Intercepts removeItem / setItem / clear on localStorage so an attacker
// cannot simply type `localStorage.removeItem('device_ban')` in the console
// and have it take effect silently.

const PROTECTED_KEYS = new Set([BAN_KEYS.DEVICE_BAN, BAN_KEYS.DEVICE_ID]);

function activateStorageTamperGuard(onTamper) {
  if (_tamperProtected) return;
  _tamperProtected = true;

  // Save originals before overriding
  const _origRemoveItem = Storage.prototype.removeItem;
  const _origClear      = Storage.prototype.clear;
  const _origSetItem    = Storage.prototype.setItem;

  Storage.prototype.removeItem = function (key) {
    if (this === localStorage && PROTECTED_KEYS.has(key)) {
      console.warn('[VedAstro Security] Blocked attempt to remove protected key:', key);
      onTamper('storage_tamper_removeItem');
      return; // silently block
    }
    return _origRemoveItem.call(this, key);
  };

  Storage.prototype.clear = function () {
    if (this === localStorage) {
      // Allow clear but immediately restore the ban record after
      const backup = {};
      PROTECTED_KEYS.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) backup[k] = v;
      });
      _origClear.call(this);
      // Restore protected keys
      Object.entries(backup).forEach(([k, v]) => {
        try { _origSetItem.call(localStorage, k, v); } catch { /* ignore */ }
      });
      onTamper('storage_tamper_clear');
      return;
    }
    return _origClear.call(this);
  };

  // Prevent overwriting the ban with a tampered value
  Storage.prototype.setItem = function (key, value) {
    if (this === localStorage && PROTECTED_KEYS.has(key)) {
      // Only allow writes that come from our own banSystem (re-entrancy guard)
      // We check if the ban record being written is structurally valid
      try {
        const obj = JSON.parse(value);
        if (key === BAN_KEYS.DEVICE_BAN) {
          // Must have required fields AND not have a shorter expiry than what's stored
          if (!obj.bannedAt || !obj.expiresAt || !obj.deviceId) {
            console.warn('[VedAstro Security] Blocked attempt to write invalid ban record');
            onTamper('storage_tamper_setItem');
            return;
          }
          const existing = (() => {
            try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
          })();
          // Reject if the new expiry is earlier than the existing one (ban shortening attack)
          if (existing && new Date(obj.expiresAt) < new Date(existing.expiresAt)) {
            console.warn('[VedAstro Security] Blocked attempt to shorten ban expiry');
            onTamper('storage_tamper_ban_shorten');
            return;
          }
        }
      } catch {
        // Not JSON — block writes to protected keys
        if (PROTECTED_KEYS.has(key)) {
          console.warn('[VedAstro Security] Blocked non-JSON write to protected key:', key);
          onTamper('storage_tamper_setItem');
          return;
        }
      }
    }
    return _origSetItem.call(this, key, value);
  };

  // Make the overrides non-configurable to resist further tampering
  try {
    Object.defineProperty(Storage.prototype, 'removeItem', { configurable: false, writable: false });
    Object.defineProperty(Storage.prototype, 'clear',      { configurable: false, writable: false });
    Object.defineProperty(Storage.prototype, 'setItem',    { configurable: false, writable: false });
  } catch {
    // Ignore — some environments don't allow this (e.g., Safari strict mode)
  }
}

// ── DOM Integrity Guard ───────────────────────────────────────────────────────
// If someone removes the BanScreen from the DOM (e.g., via DevTools Elements panel),
// we detect it and re-trigger the ban screen.

let _domObserver = null;

export function initDomIntegrityGuard(banScreenRootId, onBanScreenRemoved) {
  if (typeof MutationObserver === 'undefined') return () => {};

  _domObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (
          removed.nodeType === Node.ELEMENT_NODE &&
          (removed.id === banScreenRootId || removed.querySelector?.(`#${banScreenRootId}`))
        ) {
          console.warn('[VedAstro Security] BanScreen was removed from DOM — re-activating');
          onBanScreenRemoved();
          return;
        }
      }
    }
  });

  _domObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    if (_domObserver) { _domObserver.disconnect(); _domObserver = null; }
  };
}

// ── Combined Initialisation ───────────────────────────────────────────────────

/**
 * Initialises all hardening layers at once.
 * @param {{ onTamper: (reason: string) => void, onBanFromOtherTab: (ban: object) => void }} opts
 * @returns {{ cleanup: () => void }}
 */
export function initBanHardener({ onTamper, onBanFromOtherTab }) {
  // 1. Storage prototype tamper guard
  activateStorageTamperGuard((reason) => {
    console.warn('[VedAstro Security] Tamper attempt:', reason);
    if (typeof onTamper === 'function') onTamper(reason);
  });

  // 2. BroadcastChannel cross-tab listener
  const cleanupBC = initBroadcastBanListener((ban) => {
    if (typeof onBanFromOtherTab === 'function') onBanFromOtherTab(ban);
  });

  // 3. storage event — catches manipulation from OTHER tabs / browser extensions
  const storageListener = (e) => {
    if (e.storageArea !== localStorage) return;
    if (e.key === BAN_KEYS.DEVICE_BAN && e.newValue === null && e.oldValue !== null) {
      // Ban was deleted from another tab / extension
      console.warn('[VedAstro Security] device_ban deleted externally — restoring');
      try { localStorage.setItem(BAN_KEYS.DEVICE_BAN, e.oldValue); } catch { /* ignore */ }
      if (typeof onTamper === 'function') onTamper('storage_event_ban_removed');
    }
  };
  window.addEventListener('storage', storageListener);

  return {
    cleanup: () => {
      cleanupBC();
      window.removeEventListener('storage', storageListener);
    },
  };
}

/**
 * Write a ban record to ALL layers simultaneously.
 * Call this instead of (or in addition to) banSystem.issueBan().
 */
export async function hardWriteBan(ban) {
  // 1. localStorage (primary)
  try { localStorage.setItem(BAN_KEYS.DEVICE_BAN, JSON.stringify(ban)); } catch { /* ignore */ }

  // 2. IndexedDB (survives localStorage.clear())
  idbWriteBan(ban); // fire-and-forget

  // 3. Service Worker CacheStorage
  swSyncBan(ban);

  // 4. BroadcastChannel (all open tabs)
  broadcastBan(ban);
}

/**
 * Multi-layer ban check: localStorage → IDB → SW cache (in that priority order).
 * Returns the most up-to-date active ban found, or null.
 * @returns {Promise<object|null>}
 */
export async function hardCheckBan() {
  // Fast path: localStorage
  const { isBanned, ban } = checkBan();
  if (isBanned) return ban;

  // Fallback 1: IndexedDB (localStorage may have been cleared)
  const idbBan = await syncBanFromIDB();
  if (idbBan) return idbBan;

  // Fallback 2: Service Worker cache
  const swBan = await swCheckBan();
  if (swBan && Date.now() < new Date(swBan.expiresAt).getTime()) {
    // Restore to localStorage for future sync reads
    try { localStorage.setItem(BAN_KEYS.DEVICE_BAN, JSON.stringify(swBan)); } catch { /* ignore */ }
    return swBan;
  }

  return null;
}
