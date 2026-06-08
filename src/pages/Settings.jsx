import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { storage, KEYS } from '../utils/storage';
import { verifyCredentials } from '../api/astrologyApi';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguagePicker from '../components/ui/LanguagePicker';

function Section({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      style={{ marginBottom: '2rem' }}
    >
      <h2 style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
        {title}
      </h2>
      <GlassCard style={{ padding: '1.5rem' }}>
        {children}
      </GlassCard>
    </motion.div>
  );
}

export default function Settings() {
  const { t } = useLanguage();
  const { dark, toggleTheme } = useTheme();
  const { credentials, login } = useAuth();
  const navigate = useNavigate();

  const birthData = storage.getBirthData();
  const cache = storage.getCache();
  const cacheTimestamp = Object.values(cache).reduce((latest, v) => {
    return v?.timestamp > latest ? v.timestamp : latest;
  }, 0);

  const [editingApi, setEditingApi] = useState(false);
  const [newUserId, setNewUserId] = useState(credentials.userId || '');
  const [newApiKey, setNewApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);

  const [fontSize, setFontSize] = useState(() => storage.get('vedastro_fontsize') || 'medium');

  const handleFontSize = (sz) => {
    setFontSize(sz);
    storage.set('vedastro_fontsize', sz);
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[sz];
  };

  const handleReVerify = async () => {
    setVerifying(true);
    try {
      await verifyCredentials(newUserId, newApiKey || credentials.apiKey);
      login(newUserId, newApiKey || credentials.apiKey);
      toast.success(t('connected'));
      setEditingApi(false);
    } catch {
      toast.error(t('invalid_credentials'));
    } finally {
      setVerifying(false);
    }
  };

  const handleClearCache = () => {
    storage.clearCache();
    toast.success('Cache cleared! Data will refresh on next visit.');
  };

  const handleClearBirth = () => {
    if (window.confirm(t('confirm_clear'))) {
      storage.remove(KEYS.BIRTH);
      toast.success('Birth data cleared.');
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              ⚙️ {t('settings')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Customize your VedAstro experience
            </p>

            {/* Appearance */}
            <Section title={t('appearance')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>
                    {dark ? t('dark_mode') : t('light_mode')}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Toggle between dark and light appearance
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem' }}>{t('font_size')}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['small', 'medium', 'large'].map((sz) => (
                    <motion.button
                      key={sz}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFontSize(sz)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '8px',
                        border: `1px solid ${fontSize === sz ? 'var(--primary)' : 'var(--border)'}`,
                        background: fontSize === sz ? 'rgba(255,215,0,0.15)' : 'transparent',
                        color: fontSize === sz ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: sz === 'small' ? '0.75rem' : sz === 'large' ? '1rem' : '0.85rem',
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      {t(sz)}
                    </motion.button>
                  ))}
                </div>
              </div>
            </Section>

            {/* Language */}
            <Section title={t('language')}>
              <LanguagePicker />
            </Section>

            {/* API Credentials */}
            <Section title={t('api_credentials')}>
              {!editingApi ? (
                <div>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('user_id')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>
                      {credentials.userId ? `${credentials.userId.slice(0, 4)}${'•'.repeat(Math.max(0, credentials.userId.length - 4))}` : 'Not set'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('api_key')}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>
                      {'•'.repeat(16)}
                    </div>
                  </div>
                  <GoldButton outline onClick={() => setEditingApi(true)}>✏️ {t('edit')}</GoldButton>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input className="input-gold" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder={t('user_id')} style={{ padding: '0.65rem 0.85rem' }} />
                  <input type="password" className="input-gold" value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} placeholder="New API Key (leave blank to keep current)" style={{ padding: '0.65rem 0.85rem' }} />
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <GoldButton onClick={handleReVerify} loading={verifying}>✓ {t('verify')}</GoldButton>
                    <GoldButton outline onClick={() => setEditingApi(false)}>Cancel</GoldButton>
                  </div>
                </div>
              )}
            </Section>

            {/* Birth Data */}
            <Section title={t('birth_data')}>
              {birthData ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem', marginBottom: '1rem' }}>
                    {[
                      ['Name', birthData.name],
                      ['Date', `${birthData.day}/${birthData.month}/${birthData.year}`],
                      ['Time', `${String(birthData.hour).padStart(2,'0')}:${String(birthData.min).padStart(2,'0')}`],
                      ['City', birthData.city || '—'],
                      ['Lat/Lon', `${birthData.lat}, ${birthData.lon}`],
                      ['Timezone', `UTC+${birthData.tzone}`],
                    ].map(([key, val]) => (
                      <div key={key}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{key}</div>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <GoldButton outline onClick={() => navigate('/birth-chart')}>✏️ {t('edit_birth')}</GoldButton>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearBirth}
                      style={{
                        background: 'rgba(248,113,113,0.1)',
                        border: '1px solid rgba(248,113,113,0.3)',
                        borderRadius: '10px',
                        padding: '0.65rem 1.2rem',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      🗑 {t('clear_birth')}
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No birth data saved</p>
                  <GoldButton onClick={() => navigate('/birth-chart')}>Set Up Birth Chart</GoldButton>
                </div>
              )}
            </Section>

            {/* Cache */}
            <Section title={t('cache')}>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {t('last_updated')}: {cacheTimestamp ? new Date(cacheTimestamp).toLocaleString('en-IN') : 'Never'}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClearCache}
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '10px',
                  padding: '0.65rem 1.2rem',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                🗑 {t('clear_cache')}
              </motion.button>
            </Section>

            {/* About */}
            <Section title={t('about')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('version')}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>1.0.0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>API Provider</span>
                  <a href="https://astrologyapi.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>AstrologyAPI.com</a>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Built with</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>React + Vite + Three.js</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)'  }}>{t('credits')}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>VedAstro Team</span>
                </div>
              </div>
            </Section>
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
