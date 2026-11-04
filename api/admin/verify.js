import { verifyJwt } from '../_lib/jwt.js';
import { getClientIp, hashIp } from '../_lib/rateLimit.js';

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  const authHeader = req.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return sendJson(res, 401, {
      ok: false,
      valid: false,
      error: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyJwt(token);

  if (!payload || payload.role !== 'admin') {
    return sendJson(res, 401, {
      ok: false,
      valid: false,
      error: 'Admin token is invalid or has expired',
    });
  }

  // Optional: check IP binding if present
  const clientIp = getClientIp(req);
  const currentIpHash = hashIp(clientIp);
  const ipMatches = !payload.ipHash || payload.ipHash === currentIpHash;

  return sendJson(res, 200, {
    ok: true,
    valid: true,
    ipBound: ipMatches,
    user: {
      email: payload.sub,
      role: payload.role,
    },
    exp: payload.exp,
  });
}

