import React, { useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import useAppStore, { useAuth } from '../../store/useAppStore';
import { useLanguage } from '../../context/LanguageContext';
import ThemeToggle from '../ui/ThemeToggle';
import LanguagePicker from '../ui/LanguagePicker';

export default function Navbar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const navRef = useRef(null);

  // Read user + connection status from store
  const currentUser = useAppStore((s) => s.currentUser);
  const isOpenRouterConnected = useAppStore((s) => s.isOpenRouterConnected);
  const orConnected = typeof isOpenRouterConnected === 'function'
    ? isOpenRouterConnected()
    : Boolean(isOpenRouterConnected);

  // Sticky blur-on-scroll
  useEffect(() => {
    const onScroll = () => {
      if (!navRef.current) return;
      if (window.scrollY > 10) {
        navRef.current.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)';
        navRef.current.style.background = 'rgba(8,13,10,0.96)';
        navRef.current.style.borderBottom = '1px solid rgba(255,42,95,0.15)';
      } else {
        navRef.current.style.boxShadow = '';
        navRef.current.style.background = '';
        navRef.current.style.borderBottom = '';
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        transition: 'background 0.3s ease, box-shadow 0.3s ease, border-bottom 0.3s ease',
      }}
    >
      {/* Left: User avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,42,95,0.3), rgba(0,229,117,0.2))',
              border: '1.5px solid rgba(255,42,95,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem',
              boxShadow: '0 0 8px rgba(255,42,95,0.25)',
            }}>
              {currentUser.avatar || '🔮'}
            </div>
            <span style={{
              fontSize: '0.78rem', fontWeight: 600,
              color: 'rgba(255,255,255,0.65)',
              maxWidth: '100px', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {currentUser.name || currentUser.username}
            </span>
          </motion.div>
        )}
      </div>

      {/* Centre: Logo + OR status dot */}
      <Link to="/home" style={{ textDecoration: 'none', justifySelf: 'center' }} aria-label="Go to home dashboard">
        <motion.div
          whileHover={{ scale: 1.05 }}
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.35rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #FF2A5F 30%, #00E575 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            letterSpacing: '0.04em',
            position: 'relative',
          }}
        >
          🔮 VedAstro
          {/* OpenRouter connection dot */}
          <motion.span
            animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            title={orConnected ? 'OpenRouter connected' : 'OpenRouter not configured'}
            style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: orConnected ? '#00E575' : 'rgba(255,42,95,0.6)',
              display: 'inline-block', marginLeft: '2px', marginBottom: '6px',
              boxShadow: orConnected ? '0 0 6px #00E575' : '0 0 4px rgba(255,42,95,0.5)',
            }}
          />
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
            background: 'rgba(255,42,95,0.1)',
            border: '1px solid rgba(255,42,95,0.3)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            color: '#FF6B9D',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            boxShadow: '0 0 8px rgba(255,42,95,0.1)',
          }}
        >
          <LogOut size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{t('logout')}</span>
        </motion.button>
      </div>
    </nav>
  );
}
