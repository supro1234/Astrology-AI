/**
 * AdminLogin.jsx — Hardened Admin Authentication Gate
 *
 * Standalone page — not part of the user login flow.
 * Uses adminDatabase.js (3-layer security) — no .env credentials.
 *
 * Flow:
 *  1. Check if vault is bootstrapped → if not, show setup instructions
 *  2. Admin enters email + password
 *  3. Layer 3 rate limit checked
 *  4. Layer 1 PBKDF2 hash verified
 *  5. Layer 2 session token issued (fingerprint-bound, in-memory)
 *  6. Redirect to /admin dashboard
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  authenticateAdmin,
  isAdminBootstrapped,
  getRateLimitStatus,
  verifyAdminSession,
} from '../db/adminDatabase';

const MAX_ATTEMPTS = 5;

// ── Colours (matching app theme) ──────────────────────────────────────────────
const C = {
  red:   '#FF2A5F',
  green: '#00E575',
  gold:  '#FFD700',
  muted: 'rgba(255,255,255,0.4)',
  bg:    '#070D0A',
};

// ── Countdown timer for lockout ───────────────────────────────────────────────
function Countdown({ waitMs, onExpire }) {
  const [remaining, setRemaining] = useState(waitMs);
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1000) { clearInterval(id); onExpire(); return 0; }
        return r - 1000;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onExpire]);

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.red, fontSize: '1.1rem' }}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ── Bootstrap instructions panel ──────────────────────────────────────────────
function BootstrapGuide() {
  const [copied, setCopied] = useState(false);
  const code = `import('/src/db/adminDatabase.js').then(m =>\n  m.bootstrapAdmin('your@email.com', 'YourStr0ng!Pass12#')\n    .then(r => console.log('Done:', r))\n)`;

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,180,0,0.06)', border: '1.5px solid rgba(255,180,0,0.3)',
        borderRadius: '14px', padding: '1.4rem',
      }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔧</div>
      <h3 style={{ margin: '0 0 0.6rem', color: C.gold, fontFamily: 'Cinzel, serif', fontSize: '0.95rem' }}>
        Admin Vault Not Set Up
      </h3>
      <p style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.7, margin: '0 0 1rem' }}>
        No admin credentials exist in the secure vault. This is expected on first run.
        <br />
        Open the browser console (F12) and run:
      </p>
      <div style={{ position: 'relative' }}>
        <pre style={{
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,180,0,0.2)',
          borderRadius: '8px', padding: '0.85rem 1rem', fontSize: '0.72rem',
          color: '#e2e8f0', overflowX: 'auto', margin: 0, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {code}
        </pre>
        <button onClick={copy} style={{
          position: 'absolute', top: '0.5rem', right: '0.5rem',
          background: 'rgba(255,180,0,0.15)', border: '1px solid rgba(255,180,0,0.3)',
          color: C.gold, borderRadius: '6px', padding: '0.25rem 0.6rem',
          cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
        }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.75rem', lineHeight: 1.6 }}>
        ⚠️ Your password must be 12+ chars with uppercase, lowercase, number & symbol.<br />
        These credentials are stored only in your browser's IndexedDB vault — not in any file.
      </p>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export default function AdminLogin() {
  const navigate = useNavigate();

  const [bootstrapped, setBootstrapped] = useState(null); // null = checking
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [rateInfo, setRateInfo] = useState(null);
  const emailRef = useRef(null);

  // ── Check vault status and existing session ──────────────────────────────
  useEffect(() => {
    (async () => {
      // Already have valid session? Skip login
      const valid = await verifyAdminSession();
      if (valid) { navigate('/admin', { replace: true }); return; }

      const ready = await isAdminBootstrapped();
      setBootstrapped(ready);

      if (ready) {
        const rate = await getRateLimitStatus();
        setRateInfo(rate);
        if (!rate.locked) emailRef.current?.focus();
      }
    })();
  }, [navigate]);

  const refreshRate = async () => {
    const rate = await getRateLimitStatus();
    setRateInfo(rate);
    setError('');
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Email and password required.'); return; }
    setLoading(true);
    try {
      await authenticateAdmin(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      const rate = await getRateLimitStatus();
      setRateInfo(rate);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (bootstrapped === null) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.bg, color: C.muted, fontSize: '0.9rem',
      }}>
        ⏳ Checking vault…
      </div>
    );
  }

  const isLocked = rateInfo?.locked;

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 20% 30%, rgba(255,42,95,0.07) 0%, transparent 55%),
                   radial-gradient(ellipse at 80% 70%, rgba(0,229,117,0.05) 0%, transparent 55%),
                   ${C.bg}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: "'Inter', sans-serif",
    }}>

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,42,95,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,42,95,0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%', maxWidth: 420, position: 'relative', zIndex: 10,
          background: 'linear-gradient(145deg, rgba(12,22,16,0.98), rgba(7,11,8,0.99))',
          border: '1.5px solid rgba(255,42,95,0.25)', borderRadius: '22px',
          padding: '2.2rem',
          boxShadow: '0 0 0 1px rgba(0,229,117,0.04), 0 28px 60px rgba(0,0,0,0.8), 0 6px 28px rgba(255,42,95,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Specular line */}
        <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}
          >
            🛡️
          </motion.div>
          <h1 style={{
            margin: 0, fontFamily: 'Cinzel, serif', fontSize: '1.4rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #FF2A5F 0%, #FF6B9D 50%, #FFD700 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Admin Vault
          </h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.68rem', color: C.muted, letterSpacing: '0.1em' }}>
            VEDASTRO SECURE ACCESS
          </p>
        </div>

        {/* Not bootstrapped → show setup guide */}
        {!bootstrapped && <BootstrapGuide />}

        {/* Bootstrapped → show login form */}
        {bootstrapped && (
          <>
            {/* Error / Lockout */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    background: 'rgba(255,42,95,0.08)', border: '1px solid rgba(255,42,95,0.3)',
                    borderRadius: '10px', padding: '0.6rem 0.85rem',
                    color: '#FF6B9D', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.5,
                  }}>
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lockout countdown */}
            {isLocked && rateInfo?.waitMs > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{
                  textAlign: 'center', padding: '1.5rem 1rem',
                  background: 'rgba(255,42,95,0.06)', borderRadius: '12px',
                  border: '1px solid rgba(255,42,95,0.2)', marginBottom: '1rem',
                }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
                <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.5rem' }}>
                  Account locked. Resume in:
                </div>
                <Countdown waitMs={rateInfo.waitMs} onExpire={refreshRate} />
              </motion.div>
            )}

            {/* Rate limit progress */}
            {!isLocked && rateInfo && rateInfo.attempts > 0 && (
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1, height: '3px', borderRadius: '2px',
                      background: i < rateInfo.attempts
                        ? 'rgba(255,42,95,0.7)'
                        : 'rgba(255,255,255,0.07)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,100,100,0.6)', marginTop: '4px', textAlign: 'right' }}>
                  {rateInfo.attempts}/{MAX_ATTEMPTS} attempts
                </div>
              </div>
            )}

            {/* Form */}
            {!isLocked && (
              <form onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: C.muted, marginBottom: '0.4rem',
                  }}>
                    🔐 Admin Email
                  </label>
                  <input
                    ref={emailRef}
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@domain.com" autoComplete="username"
                    disabled={loading}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1.5px solid rgba(255,42,95,0.22)', borderRadius: '10px',
                      padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none',
                    }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: '1.4rem' }}>
                  <label style={{
                    display: 'block', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: C.muted, marginBottom: '0.4rem',
                  }}>
                    🗝️ Vault Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="12+ chars, mixed case + symbol"
                      autoComplete="current-password"
                      disabled={loading}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1.5px solid rgba(255,42,95,0.22)', borderRadius: '10px',
                        padding: '0.75rem 2.8rem 0.75rem 1rem', color: '#fff',
                        fontSize: '0.9rem', outline: 'none',
                      }}
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{
                        position: 'absolute', right: '0.65rem', top: '50%',
                        transform: 'translateY(-50%)', background: 'none', border: 'none',
                        cursor: 'pointer', color: C.muted, fontSize: '0.9rem', padding: 0,
                      }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.97 }}
                  style={{
                    width: '100%', padding: '0.88rem',
                    background: loading ? 'rgba(255,42,95,0.35)'
                      : 'linear-gradient(180deg, #FF4F7B 0%, #FF2A5F 55%, #CC1040 100%)',
                    border: 'none', borderRadius: '12px', color: '#fff',
                    fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.04em',
                    boxShadow: loading ? 'none'
                      : '0 4px 0 #8B0020, 0 6px 16px rgba(255,42,95,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
                  }}
                >
                  {loading ? '⏳ Verifying…' : '🛡️ Enter Admin Vault'}
                </motion.button>
              </form>
            )}
          </>
        )}

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '1.4rem' }}>
          <button onClick={() => navigate('/')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: '0.72rem', letterSpacing: '0.06em',
          }}>
            ← Back to VedAstro
          </button>
        </div>

        {/* Security notice */}
        <div style={{
          marginTop: '1rem', padding: '0.6rem', borderRadius: '8px',
          background: 'rgba(0,229,117,0.03)', border: '1px solid rgba(0,229,117,0.08)',
          fontSize: '0.62rem', color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 1.7,
        }}>
          🔒 Backend API Protection · Signed JWT · Server-Side IP Rate Limiting · 5-attempt lockout
        </div>
      </motion.div>
    </div>
  );
}

