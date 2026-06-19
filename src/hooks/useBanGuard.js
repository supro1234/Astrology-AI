/**
 * useBanGuard.js — VedAstro Security Layer
 *
 * ⚠️  SECURITY NOTE: This hook combines multiple layers of ban enforcement
 *     (localStorage, IndexedDB, Service Worker CacheStorage, BroadcastChannel,
 *     Storage.prototype override, DOM MutationObserver, anti-DevTools detection).
 *     Even with all these layers, a determined attacker with full browser control
 *     can ultimately bypass client-side enforcement. For production-grade security,
 *     implement server-side IP banning + TLS fingerprinting at the CDN/API layer.
 *
 * Provides the ban guard state for the React component tree.
 *
 * Returns: { isBanned, ban, timeRemaining, deviceId, triggerBanScreen }
 *
 * Hardening features:
 *   • Multi-layer ban read:     localStorage → IndexedDB → Service Worker cache
 *   • Storage tamper detection: Storage.prototype override blocks console removal
 *   • Cross-tab enforcement:    BroadcastChannel + storage event propagation
 *   • Anti-DevTools:            Detects open DevTools, shows overlay + records anomaly
 *   • DOM integrity guard:      MutationObserver re-triggers ban if screen is removed
 *   • Periodic re-verification: Polls every 5 seconds (catches async bypass attempts)
 *   • Service Worker:           Ban persists in CacheStorage across localStorage.clear()
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkBan, getBanTimeRemaining, startCleanSessionWatcher, recordAnomaly } from '../utils/banSystem';
import { getDeviceId, getDeviceIdSync }                             from '../utils/deviceFingerprint';
import {
  initBanHardener,
  hardCheckBan,
  hardWriteBan,
  initDomIntegrityGuard,
  swSyncBan,
}                                                                   from '../utils/banHardener';
import { initAntiDevTools, destroyAntiDevTools }                    from '../utils/antiDevTools';

const SW_PATH     = '/security-sw.js';
const POLL_MS     = 5000;  // re-verify ban every 5 seconds
const BAN_DOM_ID  = 'va-ban-screen-root';

// ── Service Worker registration ───────────────────────────────────────────────

async function registerSecuritySW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    // Sync any existing active ban to the SW immediately after registration
    if (navigator.serviceWorker.controller) {
      const { isBanned, ban } = checkBan();
      if (isBanned && ban) swSyncBan(ban);
    } else {
      // Wait for the SW to become active then sync
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const { isBanned, ban } = checkBan();
        if (isBanned && ban) swSyncBan(ban);
      }, { once: true });
    }
    return reg;
  } catch (e) {
    console.warn('[VedAstro Security] SW registration failed:', e.message);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBanGuard() {
  // Synchronous initial state — reads localStorage before first render
  const [banState, setBanState] = useState(() => {
    const { isBanned, ban } = checkBan();
    return { isBanned, ban };
  });

  const [deviceId, setDeviceId]     = useState(() => getDeviceIdSync());
  const [timeRemaining, setTimeRemaining] = useState(() =>
    banState.isBanned ? getBanTimeRemaining(banState.ban) : 0
  );

  const hardenerCleanupRef = useRef(null);
  const domGuardCleanupRef = useRef(null);
  const pollTimerRef       = useRef(null);
  const cleanSessionRef    = useRef(null);

  // ── Trigger ban screen immediately (mid-session) ──────────────────────────
  const triggerBanScreen = useCallback((ban) => {
    setBanState({ isBanned: true, ban });
    setTimeRemaining(getBanTimeRemaining(ban));
    // Also ensure it's written to all layers
    hardWriteBan(ban);
  }, []);

  // ── Register Service Worker ───────────────────────────────────────────────
  useEffect(() => {
    registerSecuritySW();

    // Listen for SW cross-tab ban sync messages
    const swMessageHandler = (event) => {
      if (event.data?.type === 'VA_BAN_SYNCED' && event.data.ban) {
        triggerBanScreen(event.data.ban);
      }
    };
    navigator.serviceWorker?.addEventListener('message', swMessageHandler);
    return () => navigator.serviceWorker?.removeEventListener('message', swMessageHandler);
  }, [triggerBanScreen]);

  // ── Async: compute device fingerprint ────────────────────────────────────
  useEffect(() => {
    getDeviceId().then((id) => setDeviceId(id));
  }, []);

  // ── Multi-layer ban hardening (only if not already banned) ────────────────
  useEffect(() => {
    if (banState.isBanned) return;

    const { cleanup } = initBanHardener({
      onTamper: (reason) => {
        console.warn('[VedAstro Security] Tamper detected:', reason);
        // Record tampering attempt as an anomaly (may trigger ban)
        const id = getDeviceIdSync() || 'unknown';
        const result = recordAnomaly(id);
        if (result.banned) triggerBanScreen(result.ban);
      },
      onBanFromOtherTab: (ban) => {
        triggerBanScreen(ban);
      },
    });
    hardenerCleanupRef.current = cleanup;
    return () => {
      if (hardenerCleanupRef.current) hardenerCleanupRef.current();
    };
  }, [banState.isBanned, triggerBanScreen]);

  // ── Anti-DevTools detection ───────────────────────────────────────────────
  useEffect(() => {
    const cleanup = initAntiDevTools({
      onOpen: () => {
        // DevTools opened — check if this triggered a ban
        const { isBanned, ban } = checkBan();
        if (isBanned) triggerBanScreen(ban);
      },
    });
    return cleanup;
  }, [triggerBanScreen]);

  // ── Multi-layer ban check: IDB + SW fallback (async, on mount) ───────────
  useEffect(() => {
    if (banState.isBanned) return;
    hardCheckBan().then((ban) => {
      if (ban) triggerBanScreen(ban);
    });
  }, [banState.isBanned, triggerBanScreen]);

  // ── DOM Integrity Guard (detect BanScreen DOM removal) ───────────────────
  useEffect(() => {
    if (!banState.isBanned) {
      if (domGuardCleanupRef.current) {
        domGuardCleanupRef.current();
        domGuardCleanupRef.current = null;
      }
      return;
    }
    // BanScreen is showing — watch for DOM manipulation
    const cleanup = initDomIntegrityGuard(BAN_DOM_ID, () => {
      // BanScreen was removed — immediately re-trigger
      const { isBanned, ban } = checkBan();
      if (isBanned) triggerBanScreen(ban);
    });
    domGuardCleanupRef.current = cleanup;
    return () => {
      if (domGuardCleanupRef.current) {
        domGuardCleanupRef.current();
        domGuardCleanupRef.current = null;
      }
    };
  }, [banState.isBanned, triggerBanScreen]);

  // ── Periodic re-verification (catches delayed bypass attempts) ───────────
  useEffect(() => {
    pollTimerRef.current = setInterval(async () => {
      if (banState.isBanned) return;
      const ban = await hardCheckBan();
      if (ban) triggerBanScreen(ban);
    }, POLL_MS);

    return () => clearInterval(pollTimerRef.current);
  }, [banState.isBanned, triggerBanScreen]);

  // ── Clean session watcher ────────────────────────────────────────────────
  useEffect(() => {
    if (banState.isBanned) return;
    const cleanup = startCleanSessionWatcher();
    cleanSessionRef.current = cleanup;
    return () => cleanSessionRef.current?.();
  }, [banState.isBanned]);

  // ── Live countdown ticker ────────────────────────────────────────────────
  useEffect(() => {
    if (!banState.isBanned) return;
    const tick = setInterval(() => {
      const ms = getBanTimeRemaining(banState.ban);
      setTimeRemaining(ms);
      if (ms <= 0) {
        clearInterval(tick);
        const fresh = checkBan();
        setBanState({ isBanned: fresh.isBanned, ban: fresh.ban });
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [banState.isBanned, banState.ban]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      destroyAntiDevTools();
      hardenerCleanupRef.current?.();
      domGuardCleanupRef.current?.();
      clearInterval(pollTimerRef.current);
      cleanSessionRef.current?.();
    };
  }, []);

  return {
    isBanned:         banState.isBanned,
    ban:              banState.ban,
    timeRemaining,
    deviceId,
    triggerBanScreen,
  };
}
