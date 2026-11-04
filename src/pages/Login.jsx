/**
 * Login.jsx — VedAstro Authentication + Dual API Setup & 400+ Model Explorer
 *
 * Tabs:
 *   1. Sign In   — email + password → authenticates against IndexedDB
 *   2. Register  — email, username, password, birth details, OTP verification
 *   3. API Setup — Dual API Setup:
 *                  • AstrologyAPI.com (Compulsory — tests live ephemeris & chart calculations)
 *                  • OpenRouter AI (Extracts all 400+ live models, free/paid filter, search & selection)
 *
 * Features:
 *   • Keys masked with password dots (••••••••).
 *   • Re-testing and live verification via UI test buttons.
 *   • Fetches all 400+ models live from OpenRouter.
 *   • Compulsory Astrology API: User must verify key to proceed.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore, { useAuth } from '../store/useAppStore';
import {
  authenticateUser,
  registerUser,
  verifyUserEmail,
  validatePassword,
  passwordStrength,
  createOTP,
  verifyOTP,
  sendOTPEmail,
} from '../db/userDatabase';
import { verifyCredentials } from '../api/astrologyApi';
import { storage } from '../utils/storage';
import { DEFAULT_MODEL_ID } from '../utils/aiModels';

// ─── Floating Symbol ──────────────────────────────────────────────────────────
function Floater({ symbol, style }) {
  return (
    <motion.div
      animate={{ y: [0, -16, 0], rotate: [0, 4, -4, 0], opacity: [0.06, 0.13, 0.06] }}
      transition={{ duration: 7 + Math.random() * 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute', fontSize: '3rem', userSelect: 'none', pointerEvents: 'none',
        color: '#FF2A5F', filter: 'blur(0.5px)', ...style
      }}
    >
      {symbol}
    </motion.div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, icon, autoComplete, disabled }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{
        display: 'block', fontSize: '0.68rem', fontWeight: 600,
        color: focused ? '#00E575' : 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem',
        transition: 'color 0.2s',
      }}>
        {icon} {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type === 'password' && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: disabled ? 'rgba(255,255,255,0.02)' : focused ? 'rgba(0,229,117,0.05)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${focused ? 'rgba(0,229,117,0.5)' : 'rgba(255,42,95,0.22)'}`,
            borderRadius: '10px', padding: '0.75rem 1rem',
            paddingRight: type === 'password' ? '2.8rem' : '1rem',
            color: disabled ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: '0.9rem',
            outline: 'none', transition: 'all 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(0,229,117,0.1)' : 'none',
          }}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(!show)}
            style={{
              position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', padding: 0
            }}>
            {show ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Password Strength Bar ────────────────────────────────────────────────────
function StrengthBar({ password }) {
  const { score, label, color } = passwordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= score ? color : 'rgba(255,255,255,0.1)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: '0.65rem', color, fontWeight: 600, letterSpacing: '0.06em' }}>
        {label}
      </span>
    </div>
  );
}

// ─── Alert Component ──────────────────────────────────────────────────────────
function Alert({ msg, type = 'error' }) {
  if (!msg) return null;
  const colors = {
    error: { bg: 'rgba(255,42,95,0.12)', border: 'rgba(255,42,95,0.35)', text: '#FF6B9D' },
    info:  { bg: 'rgba(0,229,117,0.09)', border: 'rgba(0,229,117,0.3)', text: '#00E575' },
    warn:  { bg: 'rgba(255,180,0,0.12)', border: 'rgba(255,180,0,0.35)', text: '#FFB400' },
  };
  const c = colors[type] || colors.error;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px',
        padding: '0.65rem 0.9rem', color: c.text, fontSize: '0.8rem',
        marginBottom: '0.85rem', lineHeight: 1.5
      }}>
      {type === 'error' ? '⚠️' : type === 'info' ? '✅' : '💡'} {msg}
    </motion.div>
  );
}

// ─── Ruby Button ──────────────────────────────────────────────────────────────
function RubyBtn({ children, onClick, disabled, type = 'button', fullWidth = true, secondary = false }) {
  return (
    <motion.button
      type={type} onClick={onClick} disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '0.78rem 1.4rem', borderRadius: '10px',
        border: secondary ? '1px solid rgba(255,255,255,0.12)' : 'none',
        background: disabled
          ? 'rgba(255,255,255,0.06)'
          : secondary
          ? 'rgba(255,255,255,0.04)'
          : 'linear-gradient(135deg, #FF2A5F 0%, #D41B4A 100%)',
        color: disabled ? 'rgba(255,255,255,0.25)' : '#fff',
        fontSize: '0.85rem', fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled || secondary ? 'none' : '0 4px 18px rgba(255,42,95,0.35)',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        transition: 'all 0.2s', marginBottom: '0.5rem',
      }}
    >
      {children}
    </motion.button>
  );
}

// ─── Model Card Component ─────────────────────────────────────────────────────
function ModelCard({ model, selected, onSelect }) {
  const isFree = model.isFree || model.id?.includes(':free');
  return (
    <div
      onClick={() => onSelect(model.id)}
      style={{
        padding: '0.55rem 0.75rem',
        borderRadius: '8px',
        marginBottom: '0.35rem',
        background: selected ? 'rgba(0,229,117,0.12)' : 'rgba(255,255,255,0.025)',
        border: selected ? '1.5px solid #00E575' : '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
    >
      <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: selected ? '#00E575' : '#fff' }}>
            {model.name}
          </span>
          {isFree ? (
            <span style={{
              fontSize: '0.58rem', fontWeight: 700,
              background: 'rgba(0,229,117,0.2)', color: '#00E575',
              padding: '0.1rem 0.35rem', borderRadius: '4px',
            }}>
              FREE
            </span>
          ) : (
            <span style={{
              fontSize: '0.58rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
              padding: '0.1rem 0.35rem', borderRadius: '4px',
            }}>
              PAID
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.67rem', color: 'rgba(255,255,255,0.38)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {model.id} {model.context ? `· ${(model.context / 1024).toFixed(0)}k context` : ''}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {selected ? (
          <span style={{ color: '#00E575', fontWeight: 700, fontSize: '0.85rem' }}>✓</span>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>Select</span>
        )}
      </div>
    </div>
  );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OTPInput({ value, onChange }) {
  const inputs = useRef([]);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = value.split('');
    next[i] = val.slice(-1);
    const joined = next.join('');
    onChange(joined);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.2rem' }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          style={{
            width: '42px', height: '48px', textAlign: 'center',
            fontSize: '1.2rem', fontWeight: 700, color: '#00E575',
            background: 'rgba(255,255,255,0.05)',
            border: `1.5px solid ${value[i] ? '#00E575' : 'rgba(255,42,95,0.25)'}`,
            borderRadius: '8px', outline: 'none',
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Login() {
  const { login, isAuthenticated, setOpenRouterKey, setOpenRouterModel,
          setAstrologyKey, testOpenRouterConnection, fetchOpenRouterModels, credentials } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState('signin');
  const [step, setStep] = useState('form');

  // Sign-in fields
  const [siEmail, setSiEmail]       = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail]       = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm]   = useState('');
  const [regName, setRegName]         = useState('');

  // Birth details
  const [birthDate, setBirthDate]   = useState('');
  const [birthTime, setBirthTime]   = useState('');
  const [birthPlace, setBirthPlace] = useState('');

  // OTP
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent]   = useState(false);

  // ─── API Setup Credentials (Loaded safely from .env or memory) ──────────────
  const envAstroKey  = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_ASTRO_API_KEY?.trim() || '') : '';
  const envAstroUser = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_ASTRO_USER_ID?.trim() || '') : '';
  const envOrKey     = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_OPENROUTER_API_KEY?.trim() || '') : '';
  const envOrModel   = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_OPENROUTER_MODEL?.trim() || DEFAULT_MODEL_ID) : DEFAULT_MODEL_ID;

  // API tab state: Kept intact with password masking so keys aren't wiped!
  const [astroUserId, setAstroUserId] = useState(envAstroUser || credentials?.userId || 'seeker');
  const [astroKey, setAstroKey]       = useState(envAstroKey || credentials?.apiKey || '');
  const [orKey, setOrKey]             = useState(envOrKey || credentials?.openRouterKey || '');
  const [selectedModel, setSelectedModel] = useState(credentials?.openRouterModel || storage.get('or_model') || envOrModel);

  // Show/hide eye toggle for password dots
  const [showAstroKey, setShowAstroKey] = useState(false);
  const [showOrKey, setShowOrKey]       = useState(false);

  // Verification & test states
  const [astroTesting, setAstroTesting]   = useState(false);
  const [astroVerified, setAstroVerified] = useState(Boolean(envAstroKey));
  const [astroTestMsg, setAstroTestMsg]   = useState(
    envAstroKey ? { ok: true, msg: 'API Key ready from .env (Click Test or Re-Test to verify)' } : null
  );

  const [orTesting, setOrTesting]       = useState(false);
  const [orVerified, setOrVerified]     = useState(Boolean(envOrKey));
  const [orTestMsg, setOrTestMsg]       = useState(
    envOrKey ? { ok: true, msg: 'OpenRouter Key loaded from .env' } : null
  );

  // 400+ Models state
  const [models, setModels]             = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelSearch, setModelSearch]   = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  // ── Auto-load models if OpenRouter key is present ────────────────────────────
  useEffect(() => {
    const keyToUse = orKey.trim() || envOrKey;
    if (keyToUse) {
      loadOpenRouterModels(keyToUse);
    }
  }, []);

  const loadOpenRouterModels = async (key) => {
    setLoadingModels(true);
    try {
      const list = await fetchOpenRouterModels(key);
      if (Array.isArray(list) && list.length > 0) {
        setModels(list);
        setOrVerified(true);
      }
    } catch (_) {
      // Non-fatal
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/home', { replace: true });
  }, [isAuthenticated, navigate]);

  const reset = () => { setError(''); setInfo(''); };

  // ── SIGN IN ─────────────────────────────────────────────────────────────────
  const handleSignIn = async (e) => {
    e.preventDefault(); reset();
    if (!siEmail.trim() || !siPassword) { setError('Email and password are required.'); return; }
    setLoading(true);
    try {
      const { user } = await authenticateUser(siEmail.trim(), siPassword);
      login({
        username: user.username, name: user.username,
        email: user.email, avatar: user.avatar, role: user.role,
      }, '', astroKey || envAstroKey, orKey || envOrKey);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER step 1: form validation ────────────────────────────────────────
  const handleRegisterForm = async (e) => {
    e.preventDefault(); reset();
    if (!regEmail.includes('@')) { setError('Enter a valid email address.'); return; }
    if (regPassword !== regConfirm) { setError('Passwords do not match.'); return; }
    const { valid, errors } = validatePassword(regPassword);
    if (!valid) { setError(errors[0]); return; }
    setStep('birth');
  };

  // ── REGISTER step 2: birth details → send OTP ───────────────────────────────
  const handleBirthAndOTP = async (e) => {
    e.preventDefault(); reset();
    setLoading(true);
    try {
      const otp = await createOTP(regEmail.trim().toLowerCase());
      const mailRes = await sendOTPEmail(regEmail.trim().toLowerCase(), otp);

      if (mailRes.dev) {
        setInfo('Dev mode: check your browser console for the OTP (F12 → Console).');
      } else if (!mailRes.ok) {
        setInfo(`OTP generated. (Email not configured: ${mailRes.error}). Check browser console.`);
        console.info(`%c[VedAstro] OTP for ${regEmail}: %c${otp}`, 'color:#f59e0b;font-weight:700', 'color:#00E575;font-size:1.3em;font-weight:700');
      } else {
        setInfo(`Verification code sent to ${regEmail}.`);
      }
      setOtpSent(true);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER step 3: verify OTP → create account ───────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault(); reset();
    if (otpValue.length < 6) { setError('Enter the full 6-digit code.'); return; }
    setLoading(true);
    try {
      const verify = await verifyOTP(regEmail.trim().toLowerCase(), otpValue);
      if (!verify.ok) { setError(verify.reason || 'Invalid code.'); setLoading(false); return; }

      await registerUser({
        email: regEmail.trim().toLowerCase(),
        username: regUsername.trim() || regEmail.split('@')[0],
        password: regPassword,
        birthDetails: {
          name:  regName.trim() || regUsername.trim(),
          date:  birthDate,
          time:  birthTime,
          place: birthPlace.trim(),
        },
      });

      await verifyUserEmail(regEmail.trim().toLowerCase());
      setInfo('Account created! Sign in to continue.');
      setTab('signin'); setStep('form'); setOtpValue('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── 🧪 TEST ASTROLOGY API ───────────────────────────────────────────────────
  const handleTestAstrologyApi = async () => {
    reset();
    const effectiveToken = astroKey.trim() || envAstroKey;
    if (!effectiveToken) {
      setAstroTestMsg({ ok: false, msg: 'Please enter an Astrology API Access Token.' });
      return;
    }
    setAstroTesting(true);
    try {
      await verifyCredentials(astroUserId.trim(), effectiveToken);
      setAstroVerified(true);
      setAstroTestMsg({ ok: true, msg: 'AstrologyAPI Verified! Live planetary ephemeris connected.' });
      setAstrologyKey(effectiveToken, astroUserId.trim());
    } catch (err) {
      setAstroVerified(false);
      setAstroTestMsg({
        ok: false,
        msg: `Verification failed: ${err.message || 'Invalid Access Token'}`,
      });
    } finally {
      setAstroTesting(false);
    }
  };

  // ── 🧪 TEST OPENROUTER API & EXTRACT 400+ MODELS ────────────────────────────
  const handleTestOpenRouter = async () => {
    reset();
    const effectiveKey = orKey.trim() || envOrKey;
    if (!effectiveKey) {
      setOrTestMsg({ ok: false, msg: 'Please enter an OpenRouter API key.' });
      return;
    }
    setOrTesting(true);
    try {
      setOpenRouterKey(effectiveKey);
      const res = await testOpenRouterConnection(effectiveKey);
      if (res.ok) {
        setOrVerified(true);
        setOrTestMsg({ ok: true, msg: `OpenRouter Connected! (${res.modelCount} AI models extracted)` });
        await loadOpenRouterModels(effectiveKey);
      } else {
        setOrVerified(false);
        setOrTestMsg({ ok: false, msg: res.error || 'Connection failed — check API key.' });
      }
    } catch (err) {
      setOrVerified(false);
      setOrTestMsg({ ok: false, msg: err.message || 'Could not reach OpenRouter.' });
    } finally {
      setOrTesting(false);
    }
  };

  // ── Filtered Models (400+ models with search & free-only filter) ────────────
  const filteredModels = models.filter((m) => {
    const q = modelSearch.toLowerCase();
    const matchesSearch = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const matchesFree = !showFreeOnly || m.isFree || m.id.includes(':free');
    return matchesSearch && matchesFree;
  });

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId);
    setOpenRouterModel(modelId);
    storage.set('or_model', modelId);
  };

  // ── SAVE KEYS & ENTER ────────────────────────────────────────────────────────
  const handleSaveAndContinue = () => {
    reset();
    const effectiveAstroKey = astroKey.trim() || envAstroKey;
    if (!effectiveAstroKey) {
      setError('Astrology API key is compulsory. Enter and test your key to continue.');
      return;
    }
    if (!astroVerified) {
      setError('Please click "Test" to verify your Astrology API token before continuing.');
      return;
    }

    // Persist verified keys to store
    setAstrologyKey(effectiveAstroKey, astroUserId.trim());
    const effectiveOrKey = orKey.trim() || envOrKey;
    if (effectiveOrKey) {
      setOpenRouterKey(effectiveOrKey);
      setOpenRouterModel(selectedModel);
    }

    login({
      username: astroUserId.trim() || 'seeker',
      name:     astroUserId.trim() || 'Vedic Seeker',
      avatar:   '🔮',
      role:     'vedic_explorer',
    }, '', effectiveAstroKey, effectiveOrKey || null);

    navigate('/home', { replace: true });
  };

  // ── Guest login (compulsory API key check) ──────────────────────────────────
  const handleGuest = () => {
    const effectiveKey = astroKey.trim() || envAstroKey;
    if (!effectiveKey) {
      setError('Astrology API key is compulsory. Please configure your key in the "API Setup" tab first.');
      setTab('api');
      return;
    }
    login({ username: 'cosmic_guest', name: 'Cosmic Guest', avatar: '🌌', role: 'guest' }, '', effectiveKey, orKey || envOrKey);
    navigate('/home', { replace: true });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  const TABS = [
    { id: 'signin',   label: '🌟 Sign In'  },
    { id: 'register', label: '✨ Register'  },
    { id: 'api',      label: '⚡ API Setup' },
  ];

  const floaters = [
    { symbol: '♈', style: { top: '7%',    left: '5%'   } },
    { symbol: '♌', style: { top: '13%',   right: '7%'  } },
    { symbol: '♎', style: { top: '52%',   left: '3%'   } },
    { symbol: '🌕', style: { top: '28%',  left: '2%',  fontSize: '2.4rem' } },
    { symbol: '🪐', style: { top: '42%',  right: '2%', fontSize: '2.4rem' } },
    { symbol: '♒', style: { bottom: '15%', right: '8%' } },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 30%, rgba(255,42,95,0.1) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(0,229,117,0.08) 0%, transparent 55%), #070D0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', position: 'relative', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {floaters.map((f, i) => <Floater key={i} symbol={f.symbol} style={f.style} />)}

      {/* Grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,42,95,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,42,95,0.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45 }}
        style={{
          width: '100%', maxWidth: tab === 'api' ? '580px' : '420px',
          background: 'linear-gradient(145deg, rgba(14,24,18,0.97), rgba(7,11,8,0.99))',
          border: '1.5px solid rgba(255,42,95,0.28)',
          borderRadius: '22px', padding: '2.2rem',
          boxShadow: '0 0 0 1px rgba(0,229,117,0.06), 0 28px 60px rgba(0,0,0,0.75), 0 6px 28px rgba(255,42,95,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)', position: 'relative', zIndex: 10,
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* Specular line */}
        <div style={{
          position: 'absolute', top: 0, left: '18%', right: '18%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)'
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 8, repeat: Infinity }}
            style={{ fontSize: '2.6rem', marginBottom: '0.4rem' }}>🔮</motion.div>
          <h1 style={{
            fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #FF2A5F 0%, #FF6B9D 50%, #00E575 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0, marginBottom: '0.2rem',
          }}>VedAstro</h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', letterSpacing: '0.12em', margin: 0 }}>
            COSMIC VEDIC INTELLIGENCE
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          background: 'rgba(255,255,255,0.03)', borderRadius: '11px',
          padding: '3px', marginBottom: '1.8rem',
          border: '1px solid rgba(255,42,95,0.12)'
        }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setStep('form'); reset(); }}
              style={{
                padding: '0.5rem 0.3rem', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.22s',
                background: tab === t.id
                  ? 'linear-gradient(135deg, rgba(255,42,95,0.75), rgba(255,42,95,0.55))'
                  : 'transparent',
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.38)',
                boxShadow: tab === t.id ? '0 2px 8px rgba(255,42,95,0.35)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ─── SIGN IN ─────────────────────────────────────────────────── */}
          {tab === 'signin' && (
            <motion.form key="signin" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }} onSubmit={handleSignIn} noValidate>

              <AnimatePresence>
                {error && <Alert msg={error} type="error" />}
                {info  && <Alert msg={info}  type="info"  />}
              </AnimatePresence>

              <Field label="Email" type="email" value={siEmail} onChange={(e) => setSiEmail(e.target.value)}
                placeholder="you@example.com" icon="🌙" autoComplete="email" />
              <Field label="Password" type="password" value={siPassword} onChange={(e) => setSiPassword(e.target.value)}
                placeholder="Your secret key" icon="🔐" autoComplete="current-password" />

              <RubyBtn type="submit" disabled={loading}>
                {loading ? '⏳ Aligning stars…' : '🌟 Enter the Cosmos'}
              </RubyBtn>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.75rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.68rem', letterSpacing: '0.1em' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
              </div>

              <RubyBtn onClick={handleGuest} secondary>🌌 Explore as Guest</RubyBtn>
            </motion.form>
          )}

          {/* ─── REGISTER ────────────────────────────────────────────────── */}
          {tab === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              <AnimatePresence>
                {error && <Alert msg={error} type="error" />}
                {info  && <Alert msg={info}  type="info"  />}
              </AnimatePresence>

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.2rem' }}>
                {['form', 'birth', 'otp'].map((s, i) => (
                  <div key={s} style={{
                    flex: 1, height: '3px', borderRadius: '2px',
                    background: ['form','birth','otp'].indexOf(step) >= i ? '#FF2A5F' : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              <p style={{
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em',
                textTransform: 'uppercase', marginBottom: '1rem'
              }}>
                Step {['form','birth','otp'].indexOf(step) + 1} of 3 —{' '}
                {{ form: 'Credentials', birth: 'Birth Details', otp: 'Verify Email' }[step]}
              </p>

              <AnimatePresence mode="wait">

                {/* Step 1 — credentials */}
                {step === 'form' && (
                  <motion.form key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }} onSubmit={handleRegisterForm} noValidate>
                    <Field label="Email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@example.com" icon="📧" autoComplete="email" />
                    <Field label="Username" type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="cosmic_seeker" icon="👤" autoComplete="username" />
                    <Field label="Password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 chars, mixed case + symbol" icon="🔐" autoComplete="new-password" />
                    <StrengthBar password={regPassword} />
                    <Field label="Confirm Password" type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                      placeholder="Repeat password" icon="🔏" autoComplete="new-password" />
                    <RubyBtn type="submit" disabled={loading}>Next →</RubyBtn>
                  </motion.form>
                )}

                {/* Step 2 — birth details */}
                {step === 'birth' && (
                  <motion.form key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }} onSubmit={handleBirthAndOTP} noValidate>
                    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1rem', lineHeight: 1.6 }}>
                      Birth details power your Vedic chart. You can add/edit these later in Settings.
                    </p>
                    <Field label="Full Name" type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your given name" icon="✨" />
                    <Field label="Date of Birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                      icon="📅" />
                    <Field label="Time of Birth" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                      icon="⏰" />
                    <Field label="Birth Place (City, Country)" type="text" value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)} placeholder="e.g. Kolkata, India" icon="📍" />

                    <RubyBtn type="submit" disabled={loading}>
                      {loading ? '⏳ Sending OTP…' : 'Send Verification Code →'}
                    </RubyBtn>
                    <RubyBtn onClick={() => setStep('form')} secondary>← Back</RubyBtn>
                  </motion.form>
                )}

                {/* Step 3 — OTP */}
                {step === 'otp' && (
                  <motion.form key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }} onSubmit={handleVerifyOTP} noValidate>
                    <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>📩</div>
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                        Enter the 6-digit code sent to<br />
                        <strong style={{ color: '#00E575' }}>{regEmail}</strong>
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'rgba(255,180,0,0.8)', marginTop: '0.4rem' }}>
                        💡 Dev mode? Check the browser console (F12) for your OTP.
                      </p>
                    </div>

                    <OTPInput value={otpValue} onChange={setOtpValue} />

                    <RubyBtn type="submit" disabled={loading || otpValue.length < 6}>
                      {loading ? '⏳ Verifying…' : '✅ Verify & Create Account'}
                    </RubyBtn>
                    <RubyBtn onClick={() => { setStep('birth'); setOtpValue(''); }} secondary>← Resend Code</RubyBtn>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── ⚡ DUAL API SETUP (AstrologyAPI + OpenRouter 400+ Models) ── */}
          {tab === 'api' && (
            <motion.div key="api" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              <AnimatePresence>
                {error && <Alert msg={error} type="error" />}
                {info  && <Alert msg={info}  type="info"  />}
              </AnimatePresence>

              {/* ─── 1. COMPULSORY ASTROLOGY API ───────────────────────────── */}
              <div style={{
                padding: '1.1rem', borderRadius: '12px', marginBottom: '1.2rem',
                background: 'rgba(255,42,95,0.04)', border: '1px solid rgba(255,42,95,0.22)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FF2A5F', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    🌟 Astrology API <span style={{ fontSize: '0.65rem', background: 'rgba(255,42,95,0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>COMPULSORY</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: astroVerified ? '#00E575' : '#f87171', fontWeight: 600 }}>
                    {astroVerified ? '● Verified' : '● Needs Verification'}
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', margin: '0 0 0.8rem 0', lineHeight: 1.5 }}>
                  Generates authentic charts, planet degrees, dasha periods & panchang. You cannot continue into the app without testing this key.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <input
                    type="text" value={astroUserId} onChange={(e) => setAstroUserId(e.target.value)}
                    placeholder="User ID (optional)"
                    style={{
                      width: '32%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,42,95,0.25)', borderRadius: '8px',
                      padding: '0.65rem 0.8rem', color: '#fff', fontSize: '0.82rem', outline: 'none',
                    }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showAstroKey ? 'text' : 'password'}
                      value={astroKey}
                      onChange={(e) => {
                        setAstroKey(e.target.value);
                        setAstroVerified(false);
                      }}
                      placeholder="Access Token (ak-…)"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${astroVerified ? 'rgba(0,229,117,0.4)' : 'rgba(255,42,95,0.25)'}`,
                        borderRadius: '8px', padding: '0.65rem 2.2rem 0.65rem 0.8rem',
                        color: '#fff', fontSize: '0.82rem', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAstroKey(!showAstroKey)}
                      style={{
                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: 0
                      }}
                      title={showAstroKey ? 'Hide key dots' : 'Show key'}
                    >
                      {showAstroKey ? '🙈' : '👁️'}
                    </button>
                  </div>

                  <button
                    onClick={handleTestAstrologyApi}
                    disabled={astroTesting}
                    style={{
                      padding: '0.65rem 0.95rem', borderRadius: '8px', border: 'none',
                      background: astroVerified ? 'rgba(0,229,117,0.2)' : 'rgba(255,42,95,0.2)',
                      color: astroVerified ? '#00E575' : '#FF6B9D',
                      fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap', transition: 'all 0.2s',
                    }}
                  >
                    {astroTesting ? 'Testing…' : astroVerified ? 'Re-Test' : '🧪 Test'}
                  </button>
                </div>

                {astroTestMsg && (
                  <div style={{
                    fontSize: '0.74rem', padding: '0.4rem 0.6rem', borderRadius: '6px',
                    background: astroTestMsg.ok ? 'rgba(0,229,117,0.1)' : 'rgba(255,42,95,0.1)',
                    color: astroTestMsg.ok ? '#00E575' : '#FF6B9D',
                  }}>
                    {astroTestMsg.ok ? '✓ ' : '✕ '} {astroTestMsg.msg}
                  </div>
                )}
              </div>

              {/* ─── 2. OPENROUTER AI ENGINE (400+ MODELS EXTRACTOR) ────────── */}
              <div style={{
                padding: '1.1rem', borderRadius: '12px', marginBottom: '1.4rem',
                background: 'rgba(0,229,117,0.03)', border: '1px solid rgba(0,229,117,0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#00E575', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    ⚡ OpenRouter AI <span style={{ fontSize: '0.65rem', background: 'rgba(0,229,117,0.15)', color: '#00E575', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>AI CHAT</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: orVerified ? '#00E575' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                    {orVerified ? `● Connected (${models.length > 0 ? models.length : '400+'} Models)` : 'Extracts 400+ AI Models'}
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', margin: '0 0 0.8rem 0', lineHeight: 1.5 }}>
                  Powers VedaGuru AI. Enter your key and click Test to extract all 400+ live OpenRouter models.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showOrKey ? 'text' : 'password'}
                      value={orKey}
                      onChange={(e) => {
                        setOrKey(e.target.value);
                        setOrVerified(false);
                      }}
                      placeholder="OpenRouter Key (sk-or-v1-…)"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(0,229,117,0.25)', borderRadius: '8px',
                        padding: '0.65rem 2.2rem 0.65rem 0.8rem', color: '#fff', fontSize: '0.82rem', outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOrKey(!showOrKey)}
                      style={{
                        position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: 0
                      }}
                      title={showOrKey ? 'Hide key dots' : 'Show key'}
                    >
                      {showOrKey ? '🙈' : '👁️'}
                    </button>
                  </div>

                  <button
                    onClick={handleTestOpenRouter}
                    disabled={orTesting}
                    style={{
                      padding: '0.65rem 0.95rem', borderRadius: '8px', border: 'none',
                      background: 'rgba(0,229,117,0.15)', color: '#00E575',
                      fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                      whiteSpace: 'nowrap', transition: 'all 0.2s',
                    }}
                  >
                    {orTesting ? 'Testing…' : '🧪 Test'}
                  </button>
                </div>

                {orTestMsg && (
                  <div style={{
                    fontSize: '0.74rem', padding: '0.4rem 0.6rem', borderRadius: '6px',
                    background: orTestMsg.ok ? 'rgba(0,229,117,0.1)' : 'rgba(255,42,95,0.1)',
                    color: orTestMsg.ok ? '#00E575' : '#FF6B9D', marginBottom: '0.6rem'
                  }}>
                    {orTestMsg.ok ? '✓ ' : '✕ '} {orTestMsg.msg}
                  </div>
                )}

                {/* ─── LIVE 400+ MODELS BROWSER ───────────────────────────── */}
                {models.length > 0 && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap'
                    }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00E575', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        🤖 Choose from {filteredModels.length} Models:
                      </label>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.7rem', color: '#00E575', cursor: 'pointer', fontWeight: 600
                      }}>
                        <input
                          type="checkbox"
                          checked={showFreeOnly}
                          onChange={(e) => setShowFreeOnly(e.target.checked)}
                          style={{ accentColor: '#00E575' }}
                        />
                        Free Models Only
                      </label>
                    </div>

                    <input
                      type="text"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search 400+ models (e.g. claude, gpt, gemini, llama, deepseek)…"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(0,229,117,0.2)', borderRadius: '8px',
                        padding: '0.5rem 0.8rem', color: '#fff', fontSize: '0.8rem',
                        outline: 'none', marginBottom: '0.5rem',
                      }}
                    />

                    {/* Scrollable models list */}
                    <div style={{
                      maxHeight: '220px', overflowY: 'auto', paddingRight: '0.2rem',
                      scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,229,117,0.3) transparent'
                    }}>
                      {filteredModels.slice(0, 80).map((m) => (
                        <ModelCard
                          key={m.id}
                          model={m}
                          selected={selectedModel === m.id}
                          onSelect={handleSelectModel}
                        />
                      ))}
                      {filteredModels.length === 0 && (
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
                          No matching models found. Try unchecking "Free Models Only" or clear search.
                        </div>
                      )}
                    </div>

                    {selectedModel && (
                      <div style={{
                        marginTop: '0.6rem', padding: '0.45rem 0.75rem',
                        background: 'rgba(0,229,117,0.08)', borderRadius: '6px',
                        border: '1px solid rgba(0,229,117,0.25)', fontSize: '0.72rem', color: '#00E575',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <span>Active Model: <strong>{selectedModel}</strong></span>
                        <span>✓ Ready</span>
                      </div>
                    )}
                  </div>
                )}

                {loadingModels && (
                  <div style={{ textAlign: 'center', padding: '1rem 0', color: '#00E575', fontSize: '0.78rem' }}>
                    ⏳ Extracting all 400+ models from OpenRouter…
                  </div>
                )}
              </div>

              {/* ─── 3. SAVE & ENTER BUTTON ────────────────────────────────── */}
              <div style={{ marginTop: '1rem' }}>
                <RubyBtn
                  onClick={handleSaveAndContinue}
                  disabled={!astroKey.trim() || !astroVerified}
                >
                  {!astroKey.trim()
                    ? '🔒 Enter Astrology API Key to Continue'
                    : !astroVerified
                    ? '🧪 Click "Test" to Verify Astrology Key'
                    : '🚀 Save & Enter VedAstro'}
                </RubyBtn>

                <p style={{
                  fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)',
                  textAlign: 'center', margin: '0.5rem 0 0 0'
                }}>
                  Astrology API is compulsory. Keys are tested live before saving.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: '1.2rem', color: 'rgba(255,255,255,0.15)',
          fontSize: '0.65rem', letterSpacing: '0.07em'
        }}>
          VEDASTRO v2.0 • COMPULSORY ASTROLOGY API • 400+ OPENROUTER MODELS
        </div>
      </motion.div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
      `}</style>
    </div>
  );
}
