/**
 * deviceFingerprint.js — VedAstro Security Layer
 *
 * ⚠️  SECURITY NOTE: This fingerprint is stored in localStorage.
 *     It can be bypassed by clearing browser data / private browsing.
 *     For production-grade enforcement, combine with a server-side
 *     IP ban + persistent device fingerprinting service.
 *
 * Generates a stable device ID by hashing:
 *   • navigator.userAgent
 *   • screen width + height + colorDepth
 *   • Intl.DateTimeFormat timezone
 *   • navigator.language
 *   • navigator.platform
 *   • navigator.hardwareConcurrency
 *   • Canvas 2D rendering fingerprint (font metrics + pixel data)
 *
 * Exports:
 *   getDeviceId()     — async; reads from storage or generates + stores
 *   getDeviceIdSync() — sync; reads from storage only (may return null)
 */

const LS_DEVICE_ID = 'device_id';

// ── Canvas Fingerprint ────────────────────────────────────────────────────────
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Background
    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(0, 0, 280, 60);

    // Text rendering differences across GPUs / drivers
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('VedAstro 🌙✨ fingerprint', 10, 20);

    ctx.font = 'italic 11px Helvetica';
    ctx.fillStyle = '#C084FC';
    ctx.fillText('device-id-canary-2026', 10, 40);

    // Geometric shapes (GPU sub-pixel rendering varies)
    ctx.beginPath();
    ctx.arc(240, 30, 15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,215,0,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

// ── Collect raw browser signals ───────────────────────────────────────────────
function collectSignals() {
  const nav = navigator;
  const tz  = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'unknown-tz'; }
  })();

  return [
    nav.userAgent           || 'ua-unknown',
    String(screen.width)    + 'x' + String(screen.height),
    String(screen.colorDepth),
    tz,
    nav.language            || 'lang-unknown',
    nav.platform            || 'plat-unknown',
    String(nav.hardwareConcurrency || 0),
    getCanvasFingerprint(),
  ].join('||');
}

// ── SHA-256 hash via Web Crypto ───────────────────────────────────────────────
async function sha256Hex(str) {
  try {
    const encoder = new TextEncoder();
    const data    = encoder.encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: lightweight djb2-style hash (no Crypto API)
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
      hash |= 0; // int32
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + '-fallback';
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Reads device_id from localStorage. Returns null if not yet generated.
 * Safe to call synchronously at module load time.
 */
export function getDeviceIdSync() {
  try {
    return localStorage.getItem(LS_DEVICE_ID) || null;
  } catch {
    return null;
  }
}

/**
 * Returns the device fingerprint ID.
 * Reads from localStorage if already computed; otherwise generates, stores, and returns.
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
  // Return cached value if present
  const cached = getDeviceIdSync();
  if (cached) return cached;

  // Generate fresh fingerprint
  const signals = collectSignals();
  const id      = await sha256Hex(signals);

  try {
    localStorage.setItem(LS_DEVICE_ID, id);
  } catch {
    // Ignore storage errors (private browsing quota)
  }

  return id;
}
