import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

const LANGS = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'bn', flag: '🇧🇩', label: 'বাং' },
  { code: 'hi', flag: '🇮🇳', label: 'हिं' },
];

export default function LanguagePicker({ compact = false }) {
  const { lang, changeLang } = useLanguage();

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
      {LANGS.map((l) => (
        <motion.button
          key={l.code}
          onClick={() => changeLang(l.code)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={`Switch to ${l.label}`}
          style={{
            background: lang === l.code ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${lang === l.code ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '8px',
            padding: compact ? '0.25rem 0.4rem' : '0.35rem 0.6rem',
            cursor: 'pointer',
            color: lang === l.code ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: compact ? '0.7rem' : '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            transition: 'all 0.2s ease',
            boxShadow: lang === l.code ? 'var(--glow)' : 'none',
          }}
        >
          <span>{l.flag}</span>
          {!compact && <span>{l.label}</span>}
        </motion.button>
      ))}
    </div>
  );
}
