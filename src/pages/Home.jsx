import React, { useEffect, useState, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { formatDate } from '../utils/dateHelpers';
import { safeStr, extractLagna } from '../utils/apiHelpers';
import { getAscendantReport, getPlanets, getCurrentDasha } from '../api/astrologyApi';
import { getDashaTimeline, getNextTransition, getCountdownText } from '../utils/dashaCalculator';
import { getAccuracyStats } from '../utils/predictionDB';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GlassCard from '../components/ui/GlassCard';
import GoldButton from '../components/ui/GoldButton';


// ─── Error Boundary — prevents full black screen ─────────
class HomeBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: 'var(--text)' }}>
          <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>⚠️ Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ background: 'var(--primary)', color: '#0A0A1A', padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ZodiacWatermark() {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 0,
      pointerEvents: 'none',
      opacity: 0.04,
    }}>
      <svg width="600" height="600" viewBox="0 0 200 200" className="zodiac-watermark">
        <circle cx="100" cy="100" r="90" stroke="#FFD700" strokeWidth="0.5" fill="none" />
        <circle cx="100" cy="100" r="70" stroke="#FFD700" strokeWidth="0.3" fill="none" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          return (
            <React.Fragment key={i}>
              <line
                x1={100 + 70 * Math.cos(angle)}
                y1={100 + 70 * Math.sin(angle)}
                x2={100 + 90 * Math.cos(angle)}
                y2={100 + 90 * Math.sin(angle)}
                stroke="#FFD700"
                strokeWidth="0.5"
              />
              <text
                x={100 + 60 * Math.cos(angle)}
                y={100 + 60 * Math.sin(angle)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#FFD700"
                fontSize="8"
              >
                {['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'][i]}
              </text>
            </React.Fragment>
          );
        })}
      </svg>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div className="skeleton" style={{ height: '12px', width: '60%', marginBottom: '0.75rem' }} />
      <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '0.5rem' }} />
      <div className="skeleton" style={{ height: '12px', width: '50%' }} />
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

export default function Home() {
  const { t, lang } = useLanguage();
  const { credentials } = useAuth();
  const navigate = useNavigate();

  const birthData = storage.getBirthData();
  const [summary, setSummary] = useState({ lagna: null, sun: null, moon: null, dasha: null });
  const [dashaTimeline, setDashaTimeline] = useState([]);
  const [accuracyStats, setAccuracyStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!birthData) return;
    setLoading(true);

    const cacheKey = `home_summary_v3_${lang}_${birthData.year}${birthData.month}${birthData.day}`;
    const cached = storage.getCacheEntry(cacheKey);
    if (cached) {
      setSummary(cached);
      setLoading(false);
      return;
    }

    Promise.allSettled([
      getAscendantReport(birthData, credentials),
      getPlanets(birthData, credentials),
      getCurrentDasha(birthData, credentials),
      getAccuracyStats()
    ]).then(([ascRes, planetsRes, dashaRes, accRes]) => {
      // safeStr() handles cases where the API returns objects instead of strings
      const ascVal = ascRes.status === 'fulfilled' ? ascRes.value : null;
      const planetsVal = planetsRes.status === 'fulfilled' ? planetsRes.value : null;
      const dashaVal = dashaRes.status === 'fulfilled' ? dashaRes.value : null;

      const newSummary = {
        // Lagna: extract using safe method similar to Horoscope
        lagna: extractLagna(ascVal),
        // Sun sign: find Sun planet in array
        sun: safeStr(
          Array.isArray(planetsVal)
            ? planetsVal.find((p) => ['Sun', 'সূর্য', 'सूर्य', 'रवि'].includes(p.name || p.planet_name))?.sign
            : planetsVal?.sun?.sign
        ),
        // Moon sign
        moon: safeStr(
          Array.isArray(planetsVal)
            ? planetsVal.find((p) => ['Moon', 'চন্দ্র', 'चंद्र'].includes(p.name || p.planet_name))?.sign
            : planetsVal?.moon?.sign
        ),
        // Dasha: API returns {planet, planet_id, start, end} — extract planet name
        dasha: safeStr(
          dashaVal?.maha_dasha?.planet ||
          dashaVal?.maha_dasha ||
          dashaVal?.major?.planet ||
          dashaVal?.major ||
          (Array.isArray(dashaVal) ? dashaVal[0]?.planet : null) ||
          dashaVal?.planet
        ),
      };

      const timeline = getDashaTimeline(birthData, Array.isArray(planetsVal) ? planetsVal : []);
      setDashaTimeline(timeline);
      
      if (accRes.status === 'fulfilled') {
        setAccuracyStats(accRes.value);
      }

      console.log('[Home] Summary extracted:', newSummary);
      setSummary(newSummary);
      storage.setCacheEntry(cacheKey, { summary: newSummary, timeline });
      setLoading(false);
    }).catch((err) => {
      console.error('[Home] API fetch error:', err);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, credentials]);

  const cards = [
    { title: t('sun_sign'), value: summary.sun, icon: '☀️', delay: 0 },
    { title: t('moon_sign'), value: summary.moon, icon: '🌙', delay: 0.1 },
    { title: t('current_dasha'), value: summary.dasha, icon: '🪐', delay: 0.2 },
  ];

  const nextTransition = getNextTransition(dashaTimeline);
  const timeToTransition = nextTransition ? (nextTransition.startDate - new Date()) / (1000 * 60 * 60 * 24 * 30) : 999;
  const isTransitionSoon = timeToTransition <= 3; // within 3 months

  // Cosmic Weather Calculation
  const todayNum = (new Date().getDate() % 9) || 9;

  return (
    <HomeBoundary>
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content" style={{ position: 'relative' }}>
          <ZodiacWatermark />

          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '2rem', position: 'relative', zIndex: 1 }}
          >
            <h1 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
              fontWeight: 700,
              color: 'var(--primary)',
              marginBottom: '0.25rem',
            }}>
              {t('namaste')}{birthData?.name ? `, ${birthData.name}` : ''} 🙏
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {formatDate()} • {t('home')}
            </p>
          </motion.div>

          {/* No birth data banner */}
          {!birthData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card"
              style={{
                padding: '1.5rem',
                marginBottom: '2rem',
                borderLeft: '4px solid var(--primary)',
                background: 'rgba(255,215,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                  ✨ Set up your birth chart
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {t('no_birth_data')} to see personalized astrology data
                </p>
              </div>
              <GoldButton onClick={() => navigate('/birth-chart')} style={{ flexShrink: 0 }}>
                {t('add_birth_chart')}
              </GoldButton>
            </motion.div>
          )}

          {/* Dasha Countdown & Prediction Accuracy Widgets */}
          {birthData && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
              
              {/* Next Dasha Transition */}
              {nextTransition && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-hover"
                  onClick={() => navigate('/horoscope')}
                  style={{
                    padding: '1.25rem', cursor: 'pointer',
                    borderLeft: `3px solid ${isTransitionSoon ? '#f87171' : 'var(--primary)'}`,
                    background: isTransitionSoon ? 'rgba(248,113,113,0.05)' : undefined
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Next Dasha Phase
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {nextTransition.emoji} {nextTransition.planet} Mahadasha
                      </div>
                      <div style={{ fontSize: '0.85rem', color: isTransitionSoon ? '#f87171' : 'var(--primary)', fontWeight: 600, marginTop: '0.25rem' }}>
                        Starts in {getCountdownText(nextTransition.startDate)}
                      </div>
                    </div>
                    {isTransitionSoon && <span style={{ fontSize: '1.5rem' }}>⚠️</span>}
                  </div>
                </motion.div>
              )}

              {/* Cosmic Weather */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card"
                style={{ padding: '1.25rem', borderLeft: '3px solid #C084FC' }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Today's Cosmic Weather
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ background: 'rgba(192,132,252,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Lucky No.</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#C084FC' }}>{todayNum}</div>
                  </div>
                  <div style={{ background: 'rgba(74,222,128,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Vibe</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80' }}>Calm</div>
                  </div>
                </div>
              </motion.div>


            </div>
          )}

          {/* Summary cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {loading
              ? cards.map((_, i) => <SkeletonCard key={i} />)
              : cards.map((card, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <GlassCard
                      tilt
                      style={{ padding: '1.25rem', cursor: 'default' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                        {card.title}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>
                        {card.value || (birthData ? '—' : 'N/A')}
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
          </motion.div>

          {/* Quick nav cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {t('explore_features')}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.75rem',
            }}>
              {[
                { icon: '✨', label: t('horoscope'), path: '/horoscope' },
                { icon: '📅', label: t('panchang'), path: '/panchang' },
                { icon: '🔢', label: t('numerology'), path: '/numerology' },
                { icon: '💑', label: t('match'), path: '/match' },
                { icon: '🔮', label: t('chat'), path: '/chat' },
              ].map((item) => (
                <motion.div
                  key={item.path}
                  className="glass-card-hover"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(item.path)}
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
    </HomeBoundary>
  );
}
