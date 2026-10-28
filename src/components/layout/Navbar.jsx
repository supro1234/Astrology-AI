import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../store/useAppStore';
import { useLanguage } from '../../context/LanguageContext';
import ThemeToggle from '../ui/ThemeToggle';
import LanguagePicker from '../ui/LanguagePicker';

export default function Navbar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);

  // Sticky blur-on-scroll: add shadow when user scrolls down
  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return;
      if (window.scrollY > 10) {
        navRef.current.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
        navRef.current.style.background = 'rgba(10, 10, 26, 0.92)';
      } else {
        navRef.current.style.boxShadow = '';
        navRef.current.style.background = '';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      ref={navRef}
      className="navbar"
      role="banner"
      aria-label="VedAstro main navigation"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 1.5rem',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Left: spacer (keeps logo centered) */}
      <div />

      {/* Centre: Logo */}
      <Link to="/home" style={{ textDecoration: 'none', justifySelf: 'center' }} aria-label="Go to home dashboard">
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--primary)',
            textShadow: '0 0 20px rgba(255,215,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            letterSpacing: '0.04em',
          }}
        >
          🔮 VedAstro
        </motion.div>
      </Link>

      {/* Right: controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifySelf: 'end' }}>
        <LanguagePicker compact />
        <ThemeToggle size="sm" />
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Log out of VedAstro"
          style={{
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid rgba(255,68,68,0.3)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            color: '#f87171',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          <LogOut size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{t('logout')}</span>
        </motion.button>
      </div>
    </nav>
  );
}
