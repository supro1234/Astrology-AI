import React, { useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import GoldButton from '../components/ui/GoldButton';
import Starfield from '../components/ui/Starfield';


const ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

function FloatingZodiac() {
  return (
    <>
      {ZODIAC_SIGNS.map((sign, i) => (
        <span
          key={i}
          className="zodiac-char"
          style={{
            left: `${(i / ZODIAC_SIGNS.length) * 100}%`,
            animationDuration: `${8 + Math.random() * 8}s`,
            animationDelay: `${Math.random() * 6}s`,
            fontSize: `${1.2 + Math.random() * 1}rem`,
          }}
        >
          {sign}
        </span>
      ))}
    </>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const handleEnter = () => {
    if (isAuthenticated) {
      navigate('/home');
    } else {
      navigate('/setup');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        }}
    >
      {/* 3D Background */}
      <Suspense fallback={null}>
        
      </Suspense>

      <Starfield />

      {/* Floating Zodiac signs */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
        <FloatingZodiac />
      </div>

      {/* Main content */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '4rem 2rem',
          maxWidth: '650px',
          width: '90%',
          borderRadius: '32px',
          border: '1px solid rgba(255, 215, 0, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255,215,0,0.05)',
        }}
      >
        {/* App name */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 900,
            color: '#FFD700',
            textShadow: '0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3), 0 0 90px rgba(255,215,0,0.1)',
            lineHeight: 1.1,
            marginBottom: '0.5rem',
          }}
        >
          🪐 VedAstro
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{
            fontSize: 'clamp(1rem, 3vw, 1.3rem)',
            color: '#94A3B8',
            marginBottom: '0.75rem',
            letterSpacing: '0.15em',
          }}
        >
          {t('tagline')}
        </motion.p>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          style={{
            width: '200px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            margin: '1.5rem auto',
          }}
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          style={{
            color: '#64748B',
            fontSize: '0.9rem',
            marginBottom: '2.5rem',
            lineHeight: 1.6,
          }}
        >
          Explore your birth chart, daily panchang, Kundli matching,<br />
          and AI-powered Vedic astrology insights.
        </motion.p>

        {/* Enter button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <GoldButton
            onClick={handleEnter}
            className="pulse-glow"
            style={{
              fontSize: '1.1rem',
              padding: '1rem 2.5rem',
              borderRadius: '50px',
              letterSpacing: '0.05em',
            }}
          >
            {t('enter_cosmos')}
          </GoldButton>
        </motion.div>

        {/* Zodiac wheel */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            zIndex: -1,
            pointerEvents: 'none',
          }}
        >
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="zodiac-watermark" style={{ opacity: 0.25 }}>
            <circle cx="100" cy="100" r="90" stroke="url(#goldGrad)" strokeWidth="0.8" />
            <circle cx="100" cy="100" r="70" stroke="#FFD700" strokeWidth="0.3" strokeDasharray="2 2" />
            <circle cx="100" cy="100" r="50" stroke="#FFD700" strokeWidth="0.3" />
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="200" y2="200">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFA500" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 100 + 50 * Math.cos(angle);
              const y1 = 100 + 50 * Math.sin(angle);
              const x2 = 100 + 90 * Math.cos(angle);
              const y2 = 100 + 90 * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD700" strokeWidth="0.5" />;
            })}
          </svg>
        </motion.div>
      </motion.div>

      {/* Bottom credits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          color: '#374151',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          zIndex: 10,
        }}
      >
        Powered by AstrologyAPI.com • Vedic Astrology Sciences
      </motion.div>
    </div>
  );
}
