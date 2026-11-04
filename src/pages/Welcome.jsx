import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import GoldButton from '../components/ui/GoldButton';
import Starfield from '../components/ui/Starfield';

const ZODIAC = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

// Deterministic floaters — no Math.random on each render
const FLOATERS = ZODIAC.map((sign, i) => ({
  sign,
  left: `${(i / ZODIAC.length) * 90 + 5}%`,
  duration: 9 + (i % 5) * 1.8,
  delay: -(i * 1.1) % 7,
  size: 1.1 + (i % 3) * 0.3,
}));

// Watermelon seed dots (static decorative)
const SEEDS = Array.from({ length: 18 }, (_, i) => ({
  top: `${8 + (i * 5.2) % 88}%`,
  left: `${4 + (i * 7.3) % 92}%`,
  rotate: (i * 37) % 180,
  opacity: 0.04 + (i % 4) * 0.02,
}));

export default function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const canvasRef = useRef(null);

  const handleEnter = () => {
    if (isAuthenticated) {
      navigate('/home');
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse at 25% 35%, rgba(255,42,95,0.18) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(0,229,117,0.14) 0%, transparent 55%), #080D0A',
    }}>

      {/* Starfield */}
      <Starfield />

      {/* Watermelon seed pattern — subtle static texture */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {SEEDS.map((s, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: s.top, left: s.left,
            width: '4px', height: '8px',
            background: 'rgba(255,42,95,0.6)',
            borderRadius: '50%',
            transform: `rotate(${s.rotate}deg)`,
            opacity: s.opacity,
          }} />
        ))}
      </div>

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,42,95,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,42,95,0.025) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Floating zodiac signs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        {FLOATERS.map((f, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            animate={{ y: [100, -80], opacity: [0, 0.5, 0.3, 0] }}
            transition={{ duration: f.duration, delay: f.delay, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: f.left,
              fontSize: `${f.size}rem`,
              color: i % 2 === 0 ? 'rgba(255,42,95,0.7)' : 'rgba(0,229,117,0.6)',
              filter: `drop-shadow(0 0 6px ${i % 2 === 0 ? 'rgba(255,42,95,0.5)' : 'rgba(0,229,117,0.4)'})`,
            }}
          >
            {f.sign}
          </motion.span>
        ))}
      </div>

      {/* ── Main Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.34, 1.4, 0.64, 1] }}
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '4rem 2.5rem 3rem',
          maxWidth: '620px',
          width: '92%',
          borderRadius: '32px',
          // 3D Watermelon Glass Card
          background: 'linear-gradient(145deg, rgba(12,22,15,0.92) 0%, rgba(8,13,10,0.97) 100%)',
          border: '1.5px solid rgba(255,42,95,0.35)',
          boxShadow: `
            0 0 0 1px rgba(0,229,117,0.1),
            0 40px 80px rgba(0,0,0,0.8),
            0 12px 32px rgba(255,42,95,0.12),
            0 4px 8px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -2px 0 rgba(255,42,95,0.08)
          `,
          backdropFilter: 'blur(40px)',
        }}
      >
        {/* Top specular edge */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
        }} />

        {/* Rotating zodiac ring — behind card content */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '560px', height: '560px',
            transform: 'translate(-50%, -50%)',
            zIndex: -1, pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 200 200" fill="none" style={{ opacity: 0.18, width: '100%', height: '100%' }}>
            <circle cx="100" cy="100" r="90" stroke="url(#wm1)" strokeWidth="0.8" />
            <circle cx="100" cy="100" r="70" stroke="#00E575" strokeWidth="0.3" strokeDasharray="2 2" />
            <circle cx="100" cy="100" r="52" stroke="#FF2A5F" strokeWidth="0.3" />
            <defs>
              <linearGradient id="wm1" x1="0" y1="0" x2="200" y2="200">
                <stop offset="0%" stopColor="#FF2A5F" stopOpacity="1" />
                <stop offset="50%" stopColor="#00E575" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FF2A5F" stopOpacity="1" />
              </linearGradient>
            </defs>
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <g key={i}>
                  <line
                    x1={100 + 52 * Math.cos(a)} y1={100 + 52 * Math.sin(a)}
                    x2={100 + 90 * Math.cos(a)} y2={100 + 90 * Math.sin(a)}
                    stroke={i % 2 === 0 ? '#FF2A5F' : '#00E575'} strokeWidth="0.5" opacity="0.6"
                  />
                  <text
                    x={100 + 42 * Math.cos(a)} y={100 + 42 * Math.sin(a)}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={i % 2 === 0 ? '#FF2A5F' : '#00E575'} fontSize="7"
                  >
                    {ZODIAC[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Planet icon */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: '3.5rem', marginBottom: '1.25rem', display: 'block' }}
        >
          🔮
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.8 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(2.8rem, 8vw, 4.8rem)',
            fontWeight: 900,
            lineHeight: 1.05,
            marginBottom: '0.5rem',
            // Watermelon gradient — ruby to emerald, NOT gold
            background: 'linear-gradient(135deg, #FF2A5F 0%, #FF7A99 40%, #00E575 75%, #38F596 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 4px 16px rgba(255,42,95,0.35))',
          }}
        >
          VedAstro
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '0.75rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {t('tagline') || 'Ancient Wisdom · Digital Precision'}
        </motion.p>

        {/* Divider — ruby→emerald gradient */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          style={{
            width: '180px', height: '1.5px',
            background: 'linear-gradient(90deg, transparent, #FF2A5F 30%, #00E575 70%, transparent)',
            margin: '1.5rem auto',
            boxShadow: '0 0 8px rgba(255,42,95,0.4)',
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '0.88rem',
            marginBottom: '2.5rem',
            lineHeight: 1.7,
            maxWidth: '420px',
            margin: '0 auto 2.5rem',
          }}
        >
          Explore your birth chart, daily panchang, Kundli matching,<br />
          and AI-powered Vedic astrology insights.
        </motion.p>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}
        >
          {['🪐 Birth Chart', '📅 Panchang', '💑 Kundli Match', '🔮 AI Chat', '✅ Todo'].map((f, i) => (
            <span key={i} style={{
              padding: '0.3rem 0.7rem',
              borderRadius: '99px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: i % 2 === 0 ? 'rgba(255,42,95,0.1)' : 'rgba(0,229,117,0.1)',
              border: `1px solid ${i % 2 === 0 ? 'rgba(255,42,95,0.3)' : 'rgba(0,229,117,0.3)'}`,
              color: i % 2 === 0 ? '#FF6B9D' : '#00E575',
              letterSpacing: '0.04em',
            }}>{f}</span>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <GoldButton
            onClick={handleEnter}
            style={{
              fontSize: '1.05rem',
              padding: '1rem 2.75rem',
              borderRadius: '50px',
              letterSpacing: '0.06em',
            }}
          >
            {t('enter_cosmos') || '✨ Enter the Cosmos'}
          </GoldButton>
        </motion.div>

        {/* Local mode badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{
            marginTop: '1.75rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '99px',
            background: 'rgba(0,229,117,0.08)',
            border: '1px solid rgba(0,229,117,0.2)',
            color: 'rgba(0,229,117,0.7)',
            fontSize: '0.68rem',
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00E575', boxShadow: '0 0 5px #00E575' }} />
          LOCAL VEDIC ENGINE • NO API KEY REQUIRED
        </motion.div>
      </motion.div>

      {/* Bottom credits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        style={{
          position: 'fixed', bottom: '1.25rem',
          color: 'rgba(255,255,255,0.15)',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          zIndex: 10,
          textTransform: 'uppercase',
        }}
      >
        VedAstro v2.0.5 • Powered by Vedic Astrology Sciences
      </motion.div>
    </div>
  );
}
