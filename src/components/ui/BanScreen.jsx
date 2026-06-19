/**
 * BanScreen.jsx — VedAstro Security Layer
 *
 * ⚠️  SECURITY NOTE: This screen is enforced by localStorage only.
 *     It can be bypassed by clearing browser storage or using a private/
 *     incognito window. For production-grade enforcement, implement a
 *     server-side IP ban + device fingerprint database lookup at the
 *     API / CDN edge layer.
 *
 * Renders a full-screen, time-locked access suspension screen.
 * Shown when a device has been banned for 24 hours due to rapid session anomalies.
 * No dismiss button — countdown must reach zero.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LockKeyhole, ShieldX, AlertTriangle } from 'lucide-react';
import { getBanTimeRemaining } from '../../utils/banSystem';

// ── Helpers ───────────────────────────────────────────────────────────────────

function msToHMS(ms) {
  if (ms <= 0) return { h: '00', m: '00', s: '00' };
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CountdownDigit({ value, label }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
    }}>
      <div style={{
        background: 'rgba(220, 38, 38, 0.12)',
        border: '1px solid rgba(220, 38, 38, 0.35)',
        borderRadius: '12px',
        padding: '12px 20px',
        minWidth: '72px',
        textAlign: 'center',
        fontFamily: "'Inter', monospace",
        fontSize: '2.2rem',
        fontWeight: 700,
        color: '#fca5a5',
        letterSpacing: '0.05em',
        boxShadow: '0 0 20px rgba(220, 38, 38, 0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        {value}
      </div>
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#9CA3AF',
      }}>{label}</span>
    </div>
  );
}

function CountdownSeparator() {
  return (
    <span style={{
      fontSize: '2rem',
      fontWeight: 700,
      color: 'rgba(220, 38, 38, 0.5)',
      marginBottom: '20px',
      userSelect: 'none',
    }}>:</span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * @param {{ ban: object, deviceId: string }} props
 */
export default function BanScreen({ ban, deviceId }) {
  const [remaining, setRemaining] = useState(() => getBanTimeRemaining(ban));
  const intervalRef = useRef(null);

  // Live countdown — tick every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const ms = getBanTimeRemaining(ban);
      setRemaining(ms);
      if (ms <= 0) {
        clearInterval(intervalRef.current);
        // Reload so main.jsx pre-render check can clear the expired ban
        window.location.reload();
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [ban]);

  const { h, m, s } = msToHMS(remaining);
  const displayId = deviceId || ban?.deviceId || 'computing…';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0A0A1A',
        backgroundImage:
          'radial-gradient(ellipse at 30% 20%, rgba(220,38,38,0.08) 0%, transparent 55%), ' +
          'radial-gradient(ellipse at 70% 80%, rgba(139,0,0,0.06) 0%, transparent 55%)',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Ambient animated ring in background */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          border: '1px solid rgba(220, 38, 38, 0.07)',
          pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          border: '1px solid rgba(192, 132, 252, 0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* Main card */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '520px',
          margin: '0 20px',
          padding: '48px 40px 36px',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%), ' +
            'rgba(15, 10, 20, 0.92)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '24px',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          boxShadow:
            '0 0 0 1px rgba(220,38,38,0.08), ' +
            '0 0 60px rgba(220, 38, 38, 0.12), ' +
            '0 0 120px rgba(139, 0, 0, 0.08), ' +
            'inset 0 1px 0 rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '0',
        }}
      >
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: '999px',
            padding: '5px 14px',
            marginBottom: '28px',
          }}
        >
          <AlertTriangle size={12} color="#f87171" />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', color: '#f87171', textTransform: 'uppercase' }}>
            Security Alert
          </span>
        </motion.div>

        {/* Lock icon with pulsing glow */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 20px rgba(220,38,38,0.3)',
              '0 0 45px rgba(220,38,38,0.6)',
              '0 0 20px rgba(220,38,38,0.3)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
          }}
        >
          <LockKeyhole size={36} color="#ef4444" strokeWidth={1.5} />
        </motion.div>

        {/* Heading */}
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(1.6rem, 5vw, 2.1rem)',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #ef4444 0%, #fca5a5 50%, #ef4444 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: 0,
          marginBottom: '16px',
          letterSpacing: '0.02em',
          lineHeight: 1.2,
        }}>
          Access Suspended
        </h1>

        {/* Shield icon row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div style={{ height: '1px', width: '40px', background: 'rgba(220,38,38,0.2)' }} />
          <ShieldX size={16} color="rgba(220,38,38,0.5)" />
          <div style={{ height: '1px', width: '40px', background: 'rgba(220,38,38,0.2)' }} />
        </div>

        {/* Body text */}
        <p style={{
          color: '#9CA3AF',
          fontSize: '0.92rem',
          lineHeight: 1.7,
          margin: 0,
          marginBottom: '36px',
          maxWidth: '380px',
        }}>
          Unusual activity was detected on this device. Access has been suspended for{' '}
          <span style={{ color: '#fca5a5', fontWeight: 600 }}>30 minutes</span>{' '}
          for security reasons. No action is required — access will be automatically restored when the timer expires.
        </p>

        {/* Countdown */}
        <div style={{ marginBottom: '36px' }}>
          <p style={{
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#6B7280',
            marginBottom: '16px',
            fontWeight: 600,
          }}>
            Time Remaining
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <CountdownDigit value={h} label="Hours" />
            <CountdownSeparator />
            <CountdownDigit value={m} label="Minutes" />
            <CountdownSeparator />
            <CountdownDigit value={s} label="Seconds" />
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: '100%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.15), transparent)',
          marginBottom: '20px',
        }} />

        {/* Device fingerprint */}
        <div style={{ width: '100%' }}>
          <p style={{
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#4B5563',
            marginBottom: '6px',
            fontWeight: 600,
          }}>
            Device Reference ID (for support)
          </p>
          <code style={{
            display: 'block',
            fontFamily: "'Courier New', 'Lucida Console', monospace",
            fontSize: '0.68rem',
            color: '#6B7280',
            wordBreak: 'break-all',
            letterSpacing: '0.04em',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            {displayId}
          </code>
        </div>
      </motion.div>
    </motion.div>
  );
}
