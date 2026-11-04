/**
 * security-sw.js — VedAstro Service Worker Ban Enforcement
 *
 * ⚠️  This Service Worker stores the device ban in the browser's CacheStorage,
 *     which is separate from localStorage and persists even when a user
 *     calls localStorage.clear() via DevTools.
 *
 * Layers implemented:
 *   1. CacheStorage persistence  — survives localStorage.clear()
 *   2. Cross-tab ban sync        — broadcasts ban to all open tabs
 *   3. Navigate interception     — blocks page re-renders if ban is active
 *
 * Message protocol (postMessage from main thread → SW):
 *   { type: 'VA_SET_BAN',   ban: <banObject> }
 *   { type: 'VA_CHECK_BAN' }
 *   { type: 'VA_CLEAR_BAN' }   ← only works if ban is actually expired
 *
 * SW → client messages:
 *   { type: 'VA_BAN_STATUS',  ban: <banObject|null> }
 *   { type: 'VA_BAN_SYNCED',  ban: <banObject> }
 */

const BAN_CACHE_NAME = 'vedastro-security-v1';
const BAN_RECORD_URL = '/va-ban-record';

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim()); // take control of all tabs immediately
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readBanFromCache() {
  try {
    const cache    = await caches.open(BAN_CACHE_NAME);
    const response = await cache.match(BAN_RECORD_URL);
    if (!response) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function writeBanToCache(ban) {
  const cache    = await caches.open(BAN_CACHE_NAME);
  const response = new Response(JSON.stringify(ban), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  await cache.put(BAN_RECORD_URL, response);
}

function isBanActive(ban) {
  if (!ban?.expiresAt) return false;
  return Date.now() < new Date(ban.expiresAt).getTime();
}

// ── Message handler ───────────────────────────────────────────────────────────

self.addEventListener('message', async (event) => {
  const { type, ban: banData } = event.data || {};

  switch (type) {
    // Main thread issued a new ban → persist it and broadcast to other tabs
    case 'VA_SET_BAN': {
      await writeBanToCache(banData);

      // Broadcast to all OTHER tabs
      const allClients = await self.clients.matchAll({ type: 'window' });
      allClients.forEach((client) => {
        if (client.id !== event.source.id) {
          client.postMessage({ type: 'VA_BAN_SYNCED', ban: banData });
        }
      });
      event.source.postMessage({ type: 'VA_BAN_STATUS', ban: banData });
      break;
    }

    // Main thread is querying the SW-stored ban (e.g., after localStorage was cleared)
    case 'VA_CHECK_BAN': {
      const ban = await readBanFromCache();
      event.source.postMessage({ type: 'VA_BAN_STATUS', ban: isBanActive(ban) ? ban : null });
      break;
    }

    // Main thread requests ban removal — only honoured if the ban has actually expired
    case 'VA_CLEAR_BAN': {
      const ban = await readBanFromCache();
      if (!isBanActive(ban)) {
        const cache = await caches.open(BAN_CACHE_NAME);
        await cache.delete(BAN_RECORD_URL);
      }
      // Never acknowledge a clear request on an active ban (resist tampering)
      event.source.postMessage({
        type: 'VA_BAN_STATUS',
        ban:  isBanActive(ban) ? ban : null,
      });
      break;
    }
  }
});

// ── Fetch interception ────────────────────────────────────────────────────────
// For navigate requests (page reloads), inject a ban gate HTML shell if banned.
// This ensures ZERO flash of app content even before React boots.

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      const ban = await readBanFromCache();
      if (isBanActive(ban)) {
        try {
          const originalResponse = await fetch(event.request);
          const originalHtml = await originalResponse.text();
          // Inject "Verifying device..." into the root div so it shows instantly,
          // but the original scripts still load and React takes over to render BanScreen.
          const modifiedHtml = originalHtml.replace(
            '<div id="root"></div>',
            '<div id="root" style="min-height:100vh;background:#0A0A1A;display:flex;align-items:center;justify-content:center;font-family:sans-serif;"><p style="color:#ef4444;opacity:0.6;">🔒 Verifying device…</p></div>'
          );
          return new Response(modifiedHtml, {
            status: 200,
            headers: originalResponse.headers
          });
        } catch (e) {
          // If offline and banned, just return a generic error or the hardcoded fallback
          return new Response('Access Suspended', { status: 403 });
        }
      }

      // Not banned — normal network fetch
      return fetch(event.request);
    })()
  );
});
