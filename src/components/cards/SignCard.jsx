import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { safeStr } from '../../utils/apiHelpers';

const SIGN_META = {
  Aries:       { symbol: '♈', color: '#FF6B6B' },
  Taurus:      { symbol: '♉', color: '#4ADE80' },
  Gemini:      { symbol: '♊', color: '#FACC15' },
  Cancer:      { symbol: '♋', color: '#93C5FD' },
  Leo:         { symbol: '♌', color: '#FFD700' },
  Virgo:       { symbol: '♍', color: '#6EE7B7' },
  Libra:       { symbol: '♎', color: '#F9A8D4' },
  Scorpio:     { symbol: '♏', color: '#C084FC' },
  Sagittarius: { symbol: '♐', color: '#FB923C' },
  Capricorn:   { symbol: '♑', color: '#94A3B8' },
  Aquarius:    { symbol: '♒', color: '#38BDF8' },
  Pisces:      { symbol: '♓', color: '#A78BFA' },
};

export default function SignCard({ title, sign: rawSign, subtitle, index = 0 }) {
  const { t } = useLanguage();
  // safeStr handles if rawSign is accidentally an object
  const sign = safeStr(rawSign) || '—';
  const tSign = t(sign) !== sign ? t(sign) : sign;

  // Reverse lookup: Find English key if 'sign' is localized
  let englishKey = sign;
  if (!SIGN_META[sign]) {
    for (const key of Object.keys(SIGN_META)) {
      if (t(key) === sign) {
        englishKey = key;
        break;
      }
    }
  }

  const meta = SIGN_META[englishKey] || { symbol: '⭐', color: 'var(--primary)' };

  return (
    <motion.div
      className="glass-card-hover"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.1 }}
      style={{ padding: '1.25rem', cursor: 'default' }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {safeStr(title)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <span style={{
          fontSize: '2.8rem',
          filter: `drop-shadow(0 0 10px ${meta.color}66)`,
          lineHeight: 1,
          color: meta.color,
        }}>
          {meta.symbol}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: meta.color }}>
            {tSign}
          </div>
          {subtitle && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
              {safeStr(subtitle)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
