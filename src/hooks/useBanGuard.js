/**
 * useBanGuard.js — VedAstro Security Layer
 *
 * ✅ DEV MODE: Completely disabled on localhost / Vite dev server.
 *    - No ban checks, no IDB restore, no polling, no DevTools detection.
 *    - The developer is NEVER blocked.
 *
 * PRODUCTION: Full multi-layer ban enforcement.
 *   • Multi-layer ban read:     localStorage → IndexedDB → Service Worker cache
 *   • Storage tamper detection: Storage.prototype override blocks console removal
 *   • Cross-tab enforcement:    BroadcastChannel + storage event propagation
 *   • Anti-DevTools:            Detects open DevTools → 30-min ban
 *   • DOM integrity guard:      MutationObserver re-triggers ban if screen removed
 *   • Periodic re-verification: Polls every 5 seconds
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

// ── Dev mode guard — all enforcement is disabled on localhost ─────────────────
const IS_DEV =
  import.meta.env.DEV ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1' ||
  location.hostname.endsWith('.local');

const SW_PATH    = '/security-sw.js';
const POLL_MS    = 5000;
const BAN_DOM_ID = 'va-ban-screen-root';

// ── Service Worker registration (production only) ─────────────────────────────

async function registerSecuritySW() {
  if (IS_DEV || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    if (navigator.serviceWorker.controller) {
      const { isBanned, ban } = checkBan();
      if (isBanned && ban) swSyncBan(ban);
    } else {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const { isBanned, ban } = checkBan();
        if (isBanned && ban) swSyncBan(ban);
      }, { once: true });
    }
  } catch { /* SW registration is non-fatal */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBanGuard() {
  // ─── DEV MODE: return completely inert state, skip ALL hooks logic ──────────
  // This prevents any ban enforcement from running on localhost.
  // React hooks rules: we must call ALL hooks unconditionally, so all hooks
  // below exist but guard with IS_DEV so they never actually do anything.
  const IS_DEV_MODE = IS_DEV;

  // In dev: always start as not banned. In prod: sync-check localStorage.
  const [banState, setBanState] = useState(() => {
    if (IS_DEV_MODE) return { isBanned: false, ban: null };
    const { isBanned, ban } = checkBan();
    return { isBanned, ban };
  });

  const [deviceId, setDeviceId]          = useState(() => IS_DEV_MODE ? 'dev-mode' : getDeviceIdSync());
  const [timeRemaining, setTimeRemaining] = useState(0);

  const hardenerCleanupRef = useRef(null);
  const domGuardCleanupRef = useRef(null);
  const pollTimerRef       = useRef(null);
  const cleanSessionRef    = useRef(null);

  // ── Trigger ban screen (mid-session, production only) ─────────────────────
  // useCallback deps must be stable — IS_DEV is a module-level constant so safe.
  const triggerBanScreen = useCallback((ban) => {
    if (IS_DEV) return; // never ban in dev
    setBanState({ isBanned: true, ban });
    setTimeRemaining(getBanTimeRemaining(ban));
    hardWriteBan(ban);
  }, []); // no deps — only uses module-level IS_DEV constant and stable setters

  // ── Service Worker (production only) ──────────────────────────────────────
  useEffect(() => {
    if (IS_DEV_MODE) return;
    registerSecuritySW();

    // Listen for SW → page ban sync messages.
    // NOTE: We do NOT call triggerBanScreen here to avoid SW feedback loop.
    // The SW stores the ban; the periodic poll or IDB check will detect it.
    const handler = (event) => {
      if (event.data?.type === 'VA_BAN_SYNCED' && event.data.ban) {
        // Only update state, do NOT call hardWriteBan (avoids SW loop)
        setBanState({ isBanned: true, ban: event.data.ban });
        setTimeRemaining(getBanTimeRemaining(event.data.ban));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Device fingerprint ────────────────────────────────────────────────────
  useEffect(() => {
    getDeviceId().then((id) => setDeviceId(id));
  }, []);

  // ── Ban hardening (production only, not already banned) ───────────────────
  useEffect(() => {
    if (IS_DEV_MODE || banState.isBanned) return;
    const { cleanup } = initBanHardener({
      onTamper: (reason) => {
        const id = getDeviceIdSync() || 'unknown';
        const result = recordAnomaly(id);
        if (result.banned) triggerBanScreen(result.ban);
      },
      onBanFromOtherTab: (ban) => triggerBanScreen(ban),
    });
    hardenerCleanupRef.current = cleanup;
    return () => hardenerCleanupRef.current?.();
  }, [banState.isBanned, triggerBanScreen]);

  // ── Anti-DevTools (production only) ───────────────────────────────────────
  useEffect(() => {
    // antiDevTools.js already has IS_DEV guard, but we skip even calling it in dev
    if (IS_DEV_MODE) return;
    const cleanup = initAntiDevTools({
      onDetected: (ban) => triggerBanScreen(ban),
    });
    return cleanup;
  }, [triggerBanScreen]);

  // ── Async multi-layer ban check: IDB + SW (production only) ──────────────
  useEffect(() => {
    if (IS_DEV_MODE || banState.isBanned) return;
    hardCheckBan().then((ban) => {
      if (ban) triggerBanScreen(ban);
    });
  }, [banState.isBanned, triggerBanScreen]);

  // ── DOM Integrity Guard (production only) ─────────────────────────────────
  useEffect(() => {
    if (IS_DEV_MODE) return;
    if (!banState.isBanned) {
      domGuardCleanupRef.current?.();
      domGuardCleanupRef.current = null;
      return;
    }
    const cleanup = initDomIntegrityGuard(BAN_DOM_ID, () => {
      const { isBanned, ban } = checkBan();
      if (isBanned) triggerBanScreen(ban);
    });
    domGuardCleanupRef.current = cleanup;
    return () => { domGuardCleanupRef.current?.(); domGuardCleanupRef.current = null; };
  }, [banState.isBanned, triggerBanScreen]);

  // ── Periodic re-verification poll (production only) ───────────────────────
  useEffect(() => {
    if (IS_DEV_MODE) return;
    pollTimerRef.current = setInterval(async () => {
      if (banState.isBanned) return;
      const ban = await hardCheckBan();
      if (ban) triggerBanScreen(ban);
    }, POLL_MS);
    return () => clearInterval(pollTimerRef.current);
  }, [banState.isBanned, triggerBanScreen]);

  // ── Clean session watcher (production only) ───────────────────────────────
  useEffect(() => {
    if (IS_DEV_MODE || banState.isBanned) return;
    const cleanup = startCleanSessionWatcher();
    cleanSessionRef.current = cleanup;
    return () => cleanSessionRef.current?.();
  }, [banState.isBanned]);

  // ── Live countdown ticker ─────────────────────────────────────────────────
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

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!IS_DEV_MODE) destroyAntiDevTools();
      hardenerCleanupRef.current?.();
      domGuardCleanupRef.current?.();
      clearInterval(pollTimerRef.current);
      cleanSessionRef.current?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isBanned:        banState.isBanned,
    ban:             banState.ban,
    timeRemaining,
    deviceId,
    triggerBanScreen,
  };
}
