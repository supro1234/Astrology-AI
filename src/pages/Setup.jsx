import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ExternalLink, Key, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { verifyCredentials } from '../api/astrologyApi';
import { storage, KEYS } from '../utils/storage';
import GoldButton from '../components/ui/GoldButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguagePicker from '../components/ui/LanguagePicker';
import Starfield from '../components/ui/Starfield';

export default function Setup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  // AstrologyAPI.com uses a single Access Token
  // The "User ID" field is kept for optional reference / display only
  const [userId, setUserId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Access Token (API Key)');
      return;
    }
    setError('');
    setLoading(true);

    // Clear any previously saved (potentially wrong) credentials before verifying
    storage.remove(KEYS.API_KEY);
    storage.remove(KEYS.USER_ID);

    try {
      await verifyCredentials(userId.trim(), apiKey.trim());

      // Only save + navigate on confirmed success
      login(userId.trim() || 'user', apiKey.trim());
      toast.success(t('connected'));
      navigate('/home');
    } catch (err) {
      console.error('[Setup] Verify error:', err);

      // Always clear credentials on any verification failure
      storage.remove(KEYS.API_KEY);
      storage.remove(KEYS.USER_ID);

      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setError('Invalid credentials. Please check your Access Token and try again.');
      } else if (status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
        setError('Connection failed. Check your internet connection.');
      } else if (status) {
        setError(`API Error ${status}: ${err?.response?.data?.message || 'Verification failed. Please check your credentials.'}`);
      } else {
        // Generic fallback — still show "invalid credentials" (most likely cause)
        setError('Invalid credentials. Please check again.');
      }
      // Button text resets automatically because loading returns to false
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleVerify();
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '1rem',
    }}>
      <Starfield />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: '460px', padding: '2.5rem', position: 'relative', zIndex: 10 }}
      >
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 20
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFD700';
            e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }}
          title="Back to Welcome Page"
          aria-label="Back to Welcome"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '1.9rem',
            fontWeight: 700,
            color: '#FFD700',
            textShadow: '0 0 20px rgba(255,215,0,0.4)',
            marginBottom: '0.5rem',
          }}>
            🪐 VedAstro
          </div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
            {t('connect_api')}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Powered by{' '}
            <a href="https://astrologyapi.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              AstrologyAPI.com
            </a>
          </p>
        </div>

        {/* Auth info banner */}
        <div style={{
          background: 'rgba(192,132,252,0.08)',
          border: '1px solid rgba(192,132,252,0.2)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'flex-start',
        }}>
          <Key size={14} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Uses your <strong style={{ color: 'var(--accent)' }}>Access Token</strong> via{' '}
            <code style={{ background: 'rgba(255,255,255,0.06)', padding: '0 4px', borderRadius: '4px', fontSize: '0.72rem' }}>x-astrologyapi-key</code>{' '}
            header. Find your token in your AstrologyAPI dashboard.
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Optional User ID / label */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
              {t('user_id')}{' '}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.6 }}>(optional — for display only)</span>
            </label>
            <input
              type="text"
              id="userId"
              className="input-gold"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your name or user ID (optional)"
              style={{ padding: '0.75rem 1rem' }}
            />
          </div>

          {/* Access Token / API Key — required */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
              Access Token (API Key) <span style={{ color: '#f87171', fontSize: '0.7rem' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showKey ? 'text' : 'password'}
                id="apiKey"
                className="input-gold"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (error) setError(''); // Clear error on new input
                }}
                onKeyDown={handleKeyDown}
                placeholder="Paste your Access Token here"
                style={{ padding: '0.75rem 3rem 0.75rem 1rem', borderColor: error ? 'rgba(248,113,113,0.5)' : undefined }}
              />
              <button
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? 'Hide token' : 'Show token'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Error — red box, stays on page */}
        {error && (
          <motion.div
            key={error}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.4)',
              borderRadius: '8px',
              padding: '0.65rem 0.9rem',
              marginBottom: '1rem',
              fontSize: '0.82rem',
              color: '#f87171',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
            }}
          >
            ⚠️ {error}
          </motion.div>
        )}

        {/* Verify button — text resets after error */}
        <GoldButton
          onClick={handleVerify}
          loading={loading}
          disabled={!apiKey.trim() || loading}
          style={{ width: '100%', marginBottom: '1.25rem', fontSize: '1rem', padding: '0.85rem' }}
        >
          {loading ? t('verify_checking') : `🔮 ${t('verify')}`}
        </GoldButton>

        {/* Get trial key */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Don't have an API key?{' '}
          </span>
          <a
            href="https://astrologyapi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#FFD700', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
          >
            {t('get_trial')} <ExternalLink size={12} />
          </a>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <LanguagePicker />
            <ThemeToggle size="sm" />
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.6 }}>
            🔒 Credentials stored in your browser only. Never sent to any third-party server.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
