import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { signJwt } from '../_lib/jwt.js';
import {
  getClientIp,
  hashIp,
  checkIpRateLimit,
  recordFailedIpAttempt,
  clearFailedIpAttempts,
} from '../_lib/rateLimit.js';

/**
 * Dynamically resolves admin credentials from .env or Vercel environment variables on EVERY request.
 * On local dev, reads ADMIN_EMAIL & ADMIN_PASSWORD from .env.
 * On Vercel production, reads process.env.ADMIN_EMAIL & process.env.ADMIN_PASSWORD.
 */
function getLiveAdminCredentials() {
  let email = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '';
  let password = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || '';

  try {
    // Look for .env in project root relative to this file
    const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key === 'ADMIN_EMAIL' || key === 'VITE_ADMIN_EMAIL') {
          if (val) email = val;
        }
        if (key === 'ADMIN_PASSWORD' || key === 'VITE_ADMIN_PASSWORD') {
          if (val) password = val;
        }
      }
    }
  } catch (err) {
    // Non-fatal, use process.env values
  }

  return {
    email: (email || '').trim().toLowerCase(),
    password: (password || '').trim(),
  };
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // Constant-time dummy comparison
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  const clientIp = getClientIp(req);

  // GET: Return rate limit status for current IP
  if (req.method === 'GET') {
    const rateCheck = checkIpRateLimit(clientIp);
    return sendJson(res, 200, {
      ok: true,
      locked: rateCheck.locked,
      waitMs: rateCheck.waitMs,
      waitMins: rateCheck.waitMins,
      remainingAttempts: rateCheck.remainingAttempts,
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const inputEmail = (body.email || '').trim().toLowerCase();
  const inputPassword = (body.password || '').trim();

  // Dynamically read expected credentials from .env on EVERY request
  const { email: rawExpectedEmail, password: rawExpectedPassword } = getLiveAdminCredentials();
  const expectedEmail = rawExpectedEmail.trim().toLowerCase();
  const expectedPassword = rawExpectedPassword.trim();

  if (!expectedEmail || !expectedPassword) {
    return sendJson(res, 500, {
      ok: false,
      error: 'Admin credentials are not configured in environment variables.',
    });
  }

  const emailMatches = safeCompare(inputEmail, expectedEmail);
  const passwordMatches = safeCompare(inputPassword, expectedPassword);

  // If credentials match: ALWAYS clear any previous failed attempts immediately!
  if (emailMatches && passwordMatches) {
    clearFailedIpAttempts(clientIp);

    const ipHash = hashIp(clientIp);
    const token = signJwt({
      sub: expectedEmail,
      role: 'admin',
      ipHash,
    });

    return sendJson(res, 200, {
      ok: true,
      token,
      user: {
        email: expectedEmail,
        username: 'admin',
        role: 'admin',
      },
      expiresInSeconds: 4 * 3600,
    });
  }

  // Credentials did not match: Check IP rate limit and record failure
  const rateCheck = checkIpRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return sendJson(res, 429, {
      ok: false,
      error: `Too many failed attempts from your IP. Lockout active for ${rateCheck.waitMins} minute(s).`,
      locked: true,
      waitMs: rateCheck.waitMs,
      waitMins: rateCheck.waitMins,
      remainingAttempts: 0,
    });
  }

  const failRate = recordFailedIpAttempt(clientIp);
  if (failRate.locked) {
    return sendJson(res, 429, {
      ok: false,
      error: 'Too many failed login attempts. Your IP has been locked out for 15 minutes.',
      locked: true,
      waitMs: failRate.waitMs,
      remainingAttempts: 0,
    });
  }

  return sendJson(res, 401, {
    ok: false,
    error: `Invalid admin credentials. ${failRate.remainingAttempts} attempt(s) remaining before IP lockout.`,
    locked: false,
    remainingAttempts: failRate.remainingAttempts,
  });
}
