import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

const NAV_ITEMS = [
  { path: '/home', icon: '🪐', key: 'home' },
  { path: '/horoscope', icon: '✨', key: 'horoscope' },
  { path: '/panchang', icon: '📅', key: 'panchang' },
  { path: '/chat', icon: '🔮', key: 'chat' },
  { path: '/settings', icon: '⚙️', key: 'settings' },
];

export default function BottomNav() {
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav" style={{ alignItems: 'center', justifyContent: 'space-around' }}>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none', flex: 1 }}>
          {({ isActive }) => (
            <motion.div
              whileTap={{ scale: 0.85 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'color 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 600, marginTop: '2px' }}>
                {t(item.key)}
              </span>
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    marginTop: '2px',
                  }}
                />
              )}
            </motion.div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
