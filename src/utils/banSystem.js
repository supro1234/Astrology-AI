/**
 * banSystem.js — VedAstro Security Layer
 *
 * ⚠️  SECURITY NOTE: This ban system uses localStorage for persistence.
 *     It can be bypassed by clearing browser storage or using a private/
 *     incognito window. For production-grade enforcement, implement a
 *     server-side IP ban + device fingerprint database lookup at the
 *     API / CDN layer. This is a best-effort client-side deterrent only.
 *
 * Responsibilities:
 *   • Track session anomaly timestamps in localStorage ("sec_anomalies")
 *   • Trigger a 24-hour device ban when ≥3 anomalies occur within 5 minutes
 *   • Persist the ban record in localStorage ("device_ban")
 *   • Provide a synchronous ban-check for pre-render gate in main.jsx
 *   • Clear the anomaly array after a clean 30-minute session
 */

// ── Storage Keys ──────────────────────────────────────────────────────────────
export const BAN_KEYS = {
  DEVICE_ID:    'device_id',
  DEVICE_BAN:   'device_ban',
  SEC_ANOMALIES:'sec_anomalies',
  CLEAN_SESSION:'sec_clean_session_start',
};

// ── Constants ─────────────────────────────────────────────────────────────────
const ANOMALY_WINDOW_MS  = 5  * 60 * 1000;  // 5-minute rolling window
const BAN_DURATION_MS    = 30 * 60 * 1000; // 30 minutes
const ANOMALY_THRESHOLD  = 3;
const CLEAN_SESSION_MS   = 30 * 60 * 1000;  // 30 minutes clean → clear anomalies

// ── Internal helpers ──────────────────────────────────────────────────────────
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore (private browsing quota exceeded)
  }
}

// ── Ban Record ────────────────────────────────────────────────────────────────

/**
 * Checks if a valid (non-expired) ban exists in localStorage.
 * Removes expired bans automatically.
 *
 * @returns {{ isBanned: boolean, ban: object|null }}
 */
export function checkBan() {
  const ban = readJSON(BAN_KEYS.DEVICE_BAN, null);
  if (!ban) return { isBanned: false, ban: null };

  const now = Date.now();
  const expiresAt = new Date(ban.expiresAt).getTime();

  if (now >= expiresAt) {
    // Ban expired — clean up
    try { localStorage.removeItem(BAN_KEYS.DEVICE_BAN); } catch { /* ignore */ }
    return { isBanned: false, ban: null };
  }

  return { isBanned: true, ban };
}

/**
 * Issues a new 24-hour ban for the given deviceId.
 * Overwrites any existing ban.
 *
 * @param {string} deviceId
 * @returns {object} the ban record
 */
export function issueBan(deviceId) {
  const bannedAt  = new Date().toISOString();
  const expiresAt = new Date(Date.now() + BAN_DURATION_MS).toISOString();

  const ban = {
    deviceId,
    bannedAt,
    expiresAt,
    reason: 'rapid_session_anomaly',
  };

  writeJSON(BAN_KEYS.DEVICE_BAN, ban);
  return ban;
}

// ── Anomaly Tracking ──────────────────────────────────────────────────────────

/**
 * Records a new session anomaly timestamp and prunes entries older than 5 min.
 * If the pruned list reaches ≥ ANOMALY_THRESHOLD, issues a 24-hour ban.
 *
 * @param {string|null} deviceId — current device fingerprint (may be null if still loading)
 * @returns {{ banned: boolean, ban: object|null, anomalyCount: number }}
 */
export function recordAnomaly(deviceId = null) {
  const now       = Date.now();
  const cutoff    = now - ANOMALY_WINDOW_MS;
  const existing  = readJSON(BAN_KEYS.SEC_ANOMALIES, []);

  // ── Deduplicate rapid anomalies ───────────────────────────────────────────
  // A single tab switch can fire both `blur` and `visibilitychange` almost
  // simultaneously. We enforce a 2-second cooldown so one action = one anomaly.
  if (existing.length > 0) {
    const lastAnomalyTime = new Date(existing[existing.length - 1]).getTime();
    if (now - lastAnomalyTime < 2000) {
      // Ignore this duplicate event
      return { banned: false, ban: null, anomalyCount: existing.length };
    }
  }

  // Prune stale anomalies
  const pruned = existing.filter((ts) => new Date(ts).getTime() > cutoff);

  // Push new timestamp
  pruned.push(new Date(now).toISOString());
  writeJSON(BAN_KEYS.SEC_ANOMALIES, pruned);

  // Reset clean-session timer
  writeJSON(BAN_KEYS.CLEAN_SESSION, null);

  const anomalyCount = pruned.length;

  // Check threshold
  if (anomalyCount >= ANOMALY_THRESHOLD) {
    const id  = deviceId || localStorage.getItem(BAN_KEYS.DEVICE_ID) || 'unknown';
    const ban = issueBan(id);
    // Clear anomaly list after banning (no need to keep accumulating)
    try { localStorage.removeItem(BAN_KEYS.SEC_ANOMALIES); } catch { /* ignore */ }
    return { banned: true, ban, anomalyCount };
  }

  return { banned: false, ban: null, anomalyCount };
}

/**
 * Clears the anomaly tracking array.
 * Call this after a successful 30-minute clean session.
 */
export function clearAnomalies() {
  try {
    localStorage.removeItem(BAN_KEYS.SEC_ANOMALIES);
    localStorage.removeItem(BAN_KEYS.CLEAN_SESSION);
  } catch { /* ignore */ }
}

// ── Clean Session Watcher ─────────────────────────────────────────────────────

/**
 * Starts (or resets) the 30-minute clean-session timer.
 * When it expires with no anomalies recorded in the interim, anomalies are cleared.
 *
 * @returns {() => void} cleanup function to call on component unmount
 */
export function startCleanSessionWatcher() {
  // Record session start if not already tracking
  const stored = readJSON(BAN_KEYS.CLEAN_SESSION, null);
  if (!stored) {
    writeJSON(BAN_KEYS.CLEAN_SESSION, new Date().toISOString());
  }

  const timerId = setInterval(() => {
    const sessionStart = readJSON(BAN_KEYS.CLEAN_SESSION, null);
    if (!sessionStart) return;

    const elapsed = Date.now() - new Date(sessionStart).getTime();
    if (elapsed >= CLEAN_SESSION_MS) {
      clearAnomalies();
    }
  }, 60_000); // check every minute

  return () => clearInterval(timerId);
}

// ── Time Remaining ────────────────────────────────────────────────────────────

/**
 * Returns milliseconds remaining on a ban. Returns 0 if ban has expired.
 * @param {object} ban — ban record with `expiresAt` ISO string
 * @returns {number}
 */
export function getBanTimeRemaining(ban) {
  if (!ban?.expiresAt) return 0;
  const remaining = new Date(ban.expiresAt).getTime() - Date.now();
  return Math.max(0, remaining);
}
