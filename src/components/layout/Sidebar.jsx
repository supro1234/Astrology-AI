import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

const NAV_ITEMS = [
  { path: '/home', icon: '🪐', key: 'home' },
  { path: '/birth-chart', icon: '👤', key: 'birth_chart' },
  { path: '/horoscope', icon: '✨', key: 'horoscope' },
  { path: '/panchang', icon: '📅', key: 'panchang' },
  { path: '/kundali', icon: '📜', key: 'kundali' },
  { path: '/numerology', icon: '🔢', key: 'numerology' },
  { path: '/match', icon: '💑', key: 'match' },
  { path: '/chat', icon: '🔮', key: 'chat' },
  { path: '/settings', icon: '⚙️', key: 'settings' },
];

export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="sidebar">
      {/* App branding */}
      <div
        style={{
          padding: '1.5rem 1.25rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textShadow: '0 0 10px rgba(255,215,0,0.3)',
          }}
        >
          🪐 VedAstro
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          Ancient Wisdom. Digital Precision.
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {NAV_ITEMS.map((item, i) => (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 4 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(255,215,0,0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.9rem',
                  boxShadow: isActive ? '0 0 10px rgba(255,215,0,0.15)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{t(item.key)}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Version */}
      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
        }}
      >
        VedAstro v1.0.0
      </div>
    </aside>
  );
}
