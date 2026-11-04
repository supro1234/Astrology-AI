import crypto from 'node:crypto';

// In-memory sliding window for IP rate limiting
// On serverless, warm lambdas retain memory across requests
const attemptsMap = new Map();

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function getClientIp(req) {
  let ip = '127.0.0.1';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    ip = list.split(',')[0].trim();
  } else {
    ip = req.headers?.['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
  }
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
  return ip;
}

export function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 16);
}

export function checkIpRateLimit(ip) {
  const now = Date.now();
  const record = attemptsMap.get(ip) || { attempts: [], lockedUntil: 0 };

  // Filter out attempts older than window
  record.attempts = record.attempts.filter((time) => now - time < LOCKOUT_WINDOW_MS);

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingMs = record.lockedUntil - now;
    return {
      allowed: false,
      locked: true,
      waitMs: remainingMs,
      waitMins: Math.ceil(remainingMs / 60000),
      remainingAttempts: 0,
    };
  }

  // Lock expired
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.lockedUntil = 0;
    record.attempts = [];
  }

  attemptsMap.set(ip, record);

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts.length);
  return {
    allowed: true,
    locked: false,
    waitMs: 0,
    remainingAttempts: remaining,
  };
}

export function recordFailedIpAttempt(ip) {
  const now = Date.now();
  const record = attemptsMap.get(ip) || { attempts: [], lockedUntil: 0 };

  record.attempts = record.attempts.filter((time) => now - time < LOCKOUT_WINDOW_MS);
  record.attempts.push(now);

  if (record.attempts.length >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }

  attemptsMap.set(ip, record);

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.attempts.length);
  return {
    locked: Boolean(record.lockedUntil && now < record.lockedUntil),
    waitMs: record.lockedUntil ? Math.max(0, record.lockedUntil - now) : 0,
    remainingAttempts: remaining,
  };
}

export function clearFailedIpAttempts(ip) {
  attemptsMap.delete(ip);
}

export function resetAllRateLimits() {
  attemptsMap.clear();
}

