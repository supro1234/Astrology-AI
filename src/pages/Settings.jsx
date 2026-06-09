import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Brain, Download, Upload, Database, Sparkles } from 'lucide-react';
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

function Section({ title, children, icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      style={{ marginBottom: '2rem' }}
    >
      <h2 style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {icon && icon} {title}
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
  const { credentials, login, setOpenRouterKey } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const birthData = storage.getBirthData();
  const cacheStats = storage.getCacheStats();
  const cacheTimestamp = Object.values(storage.getCache()).reduce((latest, v) => {
    return v?.timestamp > latest ? v.timestamp : latest;
  }, 0);

  const [editingApi, setEditingApi] = useState(false);
  const [newUserId, setNewUserId] = useState(credentials.userId || '');
  const [newApiKey, setNewApiKey] = useState('');
  const [verifying, setVerifying] = useState(false);

  // OpenRouter key state
  const [openRouterInput, setOpenRouterInput] = useState('');
  const [openRouterSaved, setOpenRouterSaved] = useState(false);

  const [fontSize, setFontSize] = useState(() => storage.get(KEYS.FONT_SIZE) || 'medium');

  const handleFontSize = (sz) => {
    setFontSize(sz);
    storage.set(KEYS.FONT_SIZE, sz);
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.fontSize = sizes[sz];
  };

  const handleReVerify = async () => {
    setVerifying(true);
    try {
      await verifyCredentials(newUserId, newApiKey || credentials.apiKey);
      login(newUserId, newApiKey || credentials.apiKey, credentials.openRouterKey);
      toast.success(t('connected'));
      setEditingApi(false);
    } catch {
      toast.error(t('invalid_credentials'));
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveOpenRouterKey = () => {
    const key = openRouterInput.trim();
    if (!key.startsWith('sk-')) {
      toast.error('Invalid OpenRouter key — must start with "sk-"');
      return;
    }
    setOpenRouterKey(key);
    setOpenRouterSaved(true);
    setOpenRouterInput('');
    toast.success('OpenRouter key saved! AI Chat is now powered by Claude ✨');
  };

  const handleClearOpenRouterKey = () => {
    setOpenRouterKey(null);
    setOpenRouterSaved(false);
    toast.success('OpenRouter key cleared');
  };

  const handleClearCache = () => {
    storage.clearCache();
    toast.success('Cache cleared! Data will refresh on next visit.');
  };

  const handleClearHoroscopeCache = () => {
    storage.invalidateCacheByPattern('horoscope');
    storage.invalidateCacheByPattern('home_summary');
    toast.success('Horoscope cache cleared. Fresh data will load on next visit.');
  };

  const handleClearBirth = () => {
    if (window.confirm(t('confirm_clear'))) {
      storage.remove(KEYS.BIRTH);
      toast.success('Birth data cleared.');
    }
  };

  const handleExport = () => {
    storage.exportUserData();
    toast.success('Data exported successfully!');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const ok = storage.importUserData(ev.target.result);
      if (ok) {
        toast.success('Data imported! Reload the page to see changes.');
      } else {
        toast.error('Import failed — invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

            {/* AstrologyAPI Credentials */}
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
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{'•'.repeat(16)}</div>
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

            {/* OpenRouter Key — AI Chat */}
            <Section title="AI Chat (OpenRouter)" icon={<Brain size={14} />}>
              <div style={{ marginBottom: '1rem', padding: '0.85rem', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <Sparkles size={14} style={{ color: '#a78bfa' }} />
                  <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '0.82rem' }}>Power up VedaGuru with Claude 3.5</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0, lineHeight: 1.55 }}>
                  Add your OpenRouter API key to get deeply personalized, context-aware astrology responses. Your key is stored <strong style={{ color: 'var(--text)' }}>only in memory</strong> — never saved to disk or sent anywhere except OpenRouter.
                </p>
              </div>

              {credentials.openRouterKey || openRouterSaved ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 700 }}>✓ OpenRouter key active</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>— Claude powers your chat</span>
                  </div>
                  <button
                    onClick={handleClearOpenRouterKey}
                    style={{
                      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: '8px', padding: '0.5rem 1rem', color: '#f87171',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    }}
                  >
                    Remove Key
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="password"
                    className="input-gold"
                    value={openRouterInput}
                    onChange={(e) => setOpenRouterInput(e.target.value)}
                    placeholder="sk-or-v1-…  (your OpenRouter API key)"
                    style={{ padding: '0.65rem 0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <GoldButton onClick={handleSaveOpenRouterKey} disabled={!openRouterInput.trim()}>
                      ✨ Activate Claude
                    </GoldButton>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600 }}
                    >
                      Get a key →
                    </a>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                    Without a key, VedaGuru uses enhanced Vedic templates that are still quite good.
                  </p>
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
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                      onClick={handleClearBirth}
                      style={{
                        background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                        borderRadius: '10px', padding: '0.65rem 1.2rem', color: '#f87171',
                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
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

            {/* Data Export / Import */}
            <Section title="Data Backup" icon={<Database size={14} />}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                Export your birth data, chat history, and settings as a JSON file. Import to restore on another device or browser.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  style={{
                    background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '10px', padding: '0.65rem 1.2rem', color: 'var(--primary)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  <Download size={15} /> Export My Data
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)',
                    borderRadius: '10px', padding: '0.65rem 1.2rem', color: '#4ade80',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  <Upload size={15} /> Import Data
                </motion.button>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </div>
            </Section>

            {/* Cache */}
            <Section title={t('cache')}>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cached entries</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{cacheStats.entries}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cache size</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{cacheStats.sizeKb} KB</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('last_updated')}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.82rem' }}>
                    {cacheTimestamp ? new Date(cacheTimestamp).toLocaleString('en-IN') : 'Never'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  onClick={handleClearHoroscopeCache}
                  style={{
                    background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)',
                    borderRadius: '10px', padding: '0.65rem 1.2rem', color: 'var(--primary)',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                  }}
                >
                  🔄 Refresh Horoscope Data
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                  onClick={handleClearCache}
                  style={{
                    background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                    borderRadius: '10px', padding: '0.65rem 1.2rem', color: '#f87171',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  }}
                >
                  🗑 {t('clear_cache')}
                </motion.button>
              </div>
            </Section>

            {/* About */}
            <Section title={t('about')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  [t('version'),    '2.0.0'],
                  ['Astrology API', 'AstrologyAPI.com'],
                  ['AI Engine',     'OpenAI GPT-4o-mini'],
                  ['Built with',    'React 19 + Vite + Three.js'],
                  [t('credits'),    'VedAstro Team'],
                ].map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{key}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>{val}</span>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
