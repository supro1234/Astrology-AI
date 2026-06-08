import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import ThemeToggle from '../ui/ThemeToggle';
import LanguagePicker from '../ui/LanguagePicker';

export default function Navbar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      className="navbar"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 1.5rem',
      }}
    >
      {/* Left: spacer (keeps logo centered) */}
      <div />

      {/* Centre: Logo */}
      <Link to="/home" style={{ textDecoration: 'none', justifySelf: 'center' }}>
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
          🪐 VedAstro
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
          <LogOut size={14} />
          <span className="hidden sm:inline">{t('logout')}</span>
        </motion.button>
      </div>
    </nav>
  );
}
