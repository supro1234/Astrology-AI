import React, { useEffect, useState, Component } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BookmarkPlus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { safeStr, extractPlanet, extractDasha, extractLagna } from '../utils/apiHelpers';
import { getAuthenticGemstones } from '../utils/gemstoneHelper';
import { getDashaTimeline } from '../utils/dashaCalculator';
import { logPrediction } from '../utils/predictionDB';
import {
  getPlanets, getAscendantReport, getCurrentDasha,
  getHouseReport, getPlanetReport, getGemSuggestion
} from '../api/astrologyApi';
import { generateDocxReport } from '../utils/docxGenerator';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GoldButton from '../components/ui/GoldButton';
import LoadingWheel from '../components/ui/LoadingWheel';
import PlanetCard from '../components/cards/PlanetCard';
import SignCard from '../components/cards/SignCard';
import DashaCard from '../components/cards/DashaCard';
import DashaTimeline from '../components/cards/DashaTimeline';

// ─── Error Boundary ───────────────────────────────────────
class PageBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem' }}>
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '12px', padding: '1.5rem',
          }}>
            <h3 style={{ color: '#f87171', marginBottom: '0.5rem' }}>⚠️ Render Error</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {this.state.error?.message}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ background: 'var(--primary)', color: '#0A0A1A', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const TABS = ['overview', 'planets', 'houses', 'dasha', 'predictions'];
const PLANET_NAMES = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];
const HOUSES = Array.from({ length: 12 }, (_, i) => i + 1);

const HOUSE_THEMES = {
  1: 'Self, Personality, Body', 2: 'Wealth, Family, Speech',
  3: 'Siblings, Courage, Communication', 4: 'Mother, Home, Happiness',
  5: 'Children, Intelligence, Romance', 6: 'Health, Enemies, Debts',
  7: 'Marriage, Partnership, Business', 8: 'Longevity, Secrets, Transformation',
  9: 'Luck, Religion, Father', 10: 'Career, Fame, Status',
  11: 'Gains, Friends, Desires', 12: 'Losses, Liberation, Foreign',
};

function HouseAccordion({ houseNum, report, t }) {
  const [open, setOpen] = useState(false);
  const reportText = safeStr(report?.report || report?.prediction || report?.description || report);

  const themeText = t(`house_${houseNum}_theme`) || HOUSE_THEMES[houseNum];

  return (
    <motion.div
      className="glass-card-hover"
      style={{ overflow: 'hidden', marginBottom: '0.4rem' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: houseNum * 0.035 }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem', minWidth: '24px' }}>
            {houseNum}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{themeText}</span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
        >
          ▾
        </motion.span>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1.25rem 1.25rem', color: 'var(--text)', fontSize: '0.84rem', lineHeight: 1.75, borderTop: '1px solid rgba(255,215,0,0.1)' }}>
              {reportText || (t('house_report_template') || `House {house} governs {theme}. The planetary ruler and its placement determine outcomes in this domain.`)
                  .replace('{house}', houseNum)
                  .replace('{theme}', themeText.toLowerCase())}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Horoscope() {
  const { t, lang } = useLanguage();
  const { credentials } = useAuth();
  const navigate = useNavigate();

  const birthData = storage.getBirthData();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ planets: null, ascendant: null, dasha: null, houses: {}, planetReports: {}, gems: null });

  useEffect(() => {
    if (!birthData) return;

    const cacheKey = `horoscope_v2_${lang}_${birthData.year}${birthData.month}${birthData.day}`;
    const cached = storage.getCacheEntry(cacheKey);
    if (cached) { setData(cached); return; }

    setLoading(true);

    const houseFetches = HOUSES.map((h) =>
      getHouseReport(h, birthData, credentials).then((r) => ({ h, r })).catch(() => ({ h, r: null }))
    );
    const planetFetches = PLANET_NAMES.map((p) =>
      getPlanetReport(p, birthData, credentials).then((r) => ({ p, r })).catch(() => ({ p, r: null }))
    );

    Promise.allSettled([
      getPlanets(birthData, credentials),
      getAscendantReport(birthData, credentials),
      getCurrentDasha(birthData, credentials),
      Promise.all(houseFetches),
      Promise.all(planetFetches),
      getGemSuggestion(birthData, credentials).catch(() => null),
    ]).then(([planetsRes, ascRes, dashaRes, housesArr, planetArr, gemsRes]) => {
      const houses = {};
      if (housesArr.status === 'fulfilled') {
        housesArr.value.forEach(({ h, r }) => { houses[h] = r; });
      }
      const planetReports = {};
      if (planetArr.status === 'fulfilled') {
        planetArr.value.forEach(({ p, r }) => { planetReports[p] = r; });
      }

      const newData = {
        planets: planetsRes.status === 'fulfilled' ? planetsRes.value : null,
        ascendant: ascRes.status === 'fulfilled' ? ascRes.value : null,
        dasha: dashaRes.status === 'fulfilled' ? dashaRes.value : null,
        houses,
        planetReports,
        gems: gemsRes.status === 'fulfilled' ? gemsRes.value : null,
      };
      setData(newData);
      storage.setCacheEntry(cacheKey, newData);
      setLoading(false);
    }).catch((err) => {
      console.error('[Horoscope] fetch error:', err);
      setLoading(false);
    });
  }, []);

  if (!birthData) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="page-with-sidebar">
          <Sidebar />
          <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
              <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>No Birth Chart Found</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Enter your birth details to generate your Vedic horoscope
              </p>
              <GoldButton onClick={() => navigate('/birth-chart')}>Set Up Birth Chart</GoldButton>
            </div>
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── Safe extractions using apiHelpers ───────────────────
  const planets = Array.isArray(data.planets) ? data.planets : [];
  const houses = Array.isArray(data.houses) ? data.houses : [];
  let lagna = extractLagna(data.ascendant);
  if (!lagna || lagna === '—') {
    if (houses.length > 0 && houses[0].sign) {
      lagna = safeStr(houses[0].sign);
    } else {
      lagna = safeStr(planets.find((p) => ['Ascendant', 'Lagna', 'লগ্না', 'লগ্ন', 'लग्ना', 'लग्न'].includes(p.name || p.planet_name))?.sign) || '—';
    }
  }
  const sunSign  = safeStr(planets.find((p) => ['Sun', 'সূর্য', 'सूर्य', 'रवि'].includes(p.name || p.planet_name))?.sign)  || '—';
  const moonSign = safeStr(planets.find((p) => ['Moon', 'চন্দ্র', 'चंद्र'].includes(p.name || p.planet_name))?.sign) || '—';
  const dasha    = extractDasha(data.dasha);
  const gems     = data.gems;

  const TAB_LABELS = {
    overview:    `🏠 ${t('overview') || 'Overview'}`,
    planets:     `🪐 ${t('planets') || 'Planets'}`,
    houses:      `🏛️ ${t('houses') || 'Houses'}`,
    dasha:       `⏳ ${t('dasha') || 'Dasha'}`,
    predictions: `✨ ${t('predictions') || 'Predictions'}`,
  };

  const formatPrediction = (key) => {
    const template = t(key);
    if (!template) return '';
    return template
      .replace(/{lagna}/g, lagna)
      .replace(/{sunSign}/g, sunSign)
      .replace(/{moonSign}/g, moonSign)
      .replace(/{mahaDasha}/g, dasha?.maha || '—');
  };

  return (
    <PageBoundary>
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.35rem' }}>
                ✨ Horoscope
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {birthData.name}'s Vedic birth chart · {birthData.day}/{birthData.month}/{birthData.year}
              </p>
            </div>


            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
              {TABS.map((tab) => (
                <motion.button
                  key={tab}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '999px',
                    border: `1px solid ${activeTab === tab ? 'var(--primary)' : 'var(--border)'}`,
                    background: activeTab === tab ? 'rgba(255,215,0,0.15)' : 'transparent',
                    color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {TAB_LABELS[tab]}
                </motion.button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <LoadingWheel size={50} />
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.88rem' }}>
                  Reading your cosmic blueprint…
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">

                {/* ─── Overview ───────────────────────────────────── */}
                {activeTab === 'overview' && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <SignCard title="RISING SIGN (LAGNA)" sign={lagna} index={0} />
                      <SignCard title="SUN SIGN" sign={sunSign} index={1} />
                      <SignCard title="MOON SIGN" sign={moonSign} index={2} />
                    </div>
                    <DashaCard dasha={data.dasha} />

                    {/* Birth summary */}
                    <motion.div
                      className="glass-card"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      style={{ padding: '1.25rem', marginTop: '1rem' }}
                    >
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Birth Summary
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                        {[
                          { label: 'Name', val: birthData.name },
                          { label: 'Date', val: `${birthData.day}/${birthData.month}/${birthData.year}` },
                          { label: 'Time', val: `${String(birthData.hour).padStart(2,'0')}:${String(birthData.min).padStart(2,'0')}` },
                          { label: 'City', val: birthData.city || '—' },
                          { label: 'Timezone', val: `UTC+${birthData.tzone}` },
                        ].map(({ label, val }) => (
                          <div key={label}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</div>
                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {/* ─── Planets ────────────────────────────────────── */}
                {activeTab === 'planets' && (
                  <motion.div key="planets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {planets.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: '1rem' }}>
                        {planets.map((p, i) => (
                          <PlanetCard
                            key={i}
                            planet={{
                              ...p,
                              report: safeStr(data.planetReports[safeStr(p.name || p.planet_name)?.toLowerCase()]?.report),
                            }}
                            index={i}
                          />
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No planet data available. Check your API credentials.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── Houses ─────────────────────────────────────── */}
                {activeTab === 'houses' && (
                  <motion.div key="houses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {HOUSES.map((h) => (
                      <HouseAccordion key={h} houseNum={h} report={data.houses[h]} t={t} />
                    ))}
                  </motion.div>
                )}

                {/* ─── Dasha Timeline ────────────────────────── */}
                {activeTab === 'dasha' && (
                  <motion.div key="dasha" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {/* New visual dasha timeline */}
                    {(() => {
                      const timeline = getDashaTimeline(birthData, Array.isArray(data.planets) ? data.planets : []);
                      return <DashaTimeline timeline={timeline} />;
                    })()}

                    {/* Dasha periods list */}
                    {(() => {
                      const periods = data.dasha?.current_dasha_list || data.dasha?.dasha_list || [];
                      if (!periods.length) return (
                        <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                          Full dasha timeline not available from this endpoint.
                        </div>
                      );
                      return (
                        <div style={{ marginTop: '1.5rem' }}>
                          <h3 style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                            Vimshottari Dasha Periods
                          </h3>
                          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {periods.slice(0, 12).map((period, i) => {
                              const planet = safeStr(period.planet || period.dasha) || '?';
                              const start  = safeStr(period.start) || '';
                              const end    = safeStr(period.end) || '';
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: 15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                  className="glass-card"
                                  style={{ minWidth: '110px', padding: '0.85rem', textAlign: 'center', flexShrink: 0 }}
                                >
                                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{t(planet) || planet}</div>
                                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {start}<br/>{end && `→ ${end}`}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                {/* ─── Predictions & Remedies ──────────────────────────────── */}
                {activeTab === 'predictions' && (
                  <motion.div key="predictions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {[
                      { tag: t('career') || 'Career',      color: '#3B82F6', icon: '💼', key: 'career',       text: formatPrediction('career_prediction'),       confidence: 0.72 },
                      { tag: t('love') || 'Love',          color: '#EC4899', icon: '❤️', key: 'love',         text: formatPrediction('love_prediction'),         confidence: 0.68 },
                      { tag: t('health') || 'Health',      color: '#10B981', icon: '🌿', key: 'health',       text: formatPrediction('health_prediction'),       confidence: 0.65 },
                      { tag: t('finance') || 'Finance',    color: '#F59E0B', icon: '💰', key: 'finance',      text: formatPrediction('finance_prediction'),      confidence: 0.70 },
                      { tag: t('family') || 'Family',      color: '#8B5CF6', icon: '🏠', key: 'family',       text: formatPrediction('family_prediction'),       confidence: 0.74 },
                      { tag: t('spirituality') || 'Spirituality', color: '#06B6D4', icon: '🧘', key: 'spirituality', text: formatPrediction('spirituality_prediction'), confidence: 0.78 },
                    ].map((item, i) => (
                      <motion.div
                        key={item.tag}
                        className="glass-card-hover"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        style={{ padding: '1.25rem', marginBottom: '0.65rem', borderLeft: `3px solid ${item.color}` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            <span style={{ fontWeight: 700, color: item.color, fontSize: '0.88rem' }}>{item.tag}</span>
                            {/* Confidence badge */}
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700,
                              color: item.confidence >= 0.7 ? '#4ade80' : '#FFD700',
                              background: item.confidence >= 0.7 ? 'rgba(74,222,128,0.1)' : 'rgba(255,215,0,0.1)',
                              borderRadius: '999px', padding: '0.1rem 0.45rem',
                              border: `1px solid ${item.confidence >= 0.7 ? 'rgba(74,222,128,0.3)' : 'rgba(255,215,0,0.3)'}`,
                            }}>
                              {Math.round(item.confidence * 100)}% conf.
                            </span>
                          </div>
                          {/* Save prediction button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={async () => {
                              try {
                                await logPrediction({
                                  type: item.key,
                                  text: item.text,
                                  confidence: item.confidence,
                                  factors: [`${lagna} ascendant`, `${dasha?.maha || 'current'} dasha`, `Sun in ${sunSign}`],
                                  birthSnapshot: { ascendant: lagna, sun: sunSign, moon: moonSign, dasha: dasha?.maha },
                                });
                                toast.success(`${item.tag} prediction saved! Track it in Predictions →`);
                              } catch (e) {
                                toast.error('Could not save prediction');
                              }
                            }}
                            style={{
                              background: `${item.color}15`, border: `1px solid ${item.color}40`,
                              borderRadius: '8px', padding: '0.3rem 0.65rem',
                              color: item.color, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.3rem',
                              fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                            }}
                          >
                            <BookmarkPlus size={12} /> Save
                          </motion.button>
                        </div>
                        <p style={{ color: 'var(--text)', fontSize: '0.84rem', lineHeight: 1.75 }}>{item.text}</p>
                      </motion.div>
                    ))}

                    {/* Gemstones Section */}
                    {gems && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        style={{ marginTop: '2rem' }}
                      >
                        <h3 style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          💎 Recommended Gemstones
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                          {['LIFE', 'BENEFIC', 'LUCKY'].map((type, idx) => {
                            const gem = gems[type];
                            if (!gem || !gem.name) return null;
                            return (
                              <div key={type} className="glass-card" style={{ padding: '1.25rem', borderTop: '2px solid rgba(255,215,0,0.3)' }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                                  {type} STONE
                                </div>
                                <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                                  {gem.name}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Deity:</span> <span>{gem.gem_deity}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Weight:</span> <span>{gem.weight}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Metal:</span> <span>{gem.wear_metal}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Finger:</span> <span>{gem.wear_finger}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Day:</span> <span>{gem.wear_day}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            )}
          </motion.div>
        </main>
      </div>
      <BottomNav />

      {/* ─── Floating Download Report Button ──────────────── */}
      {!loading && data.planets && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
          whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(255,215,0,0.7)' }}
          whileTap={{ scale: 0.92 }}
          onClick={() => generateDocxReport(birthData, data, t)}
          className="pulse-glow"
          style={{
            position: 'fixed',
            bottom: '5rem',
            right: '1.5rem',
            zIndex: 200,
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            color: '#0A0A1A',
            border: 'none',
            borderRadius: '999px',
            padding: '0.75rem 1.25rem',
            fontWeight: 800,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 20px rgba(255,215,0,0.4)',
          }}
        >
          📥 Download Report
        </motion.button>
      )}

    </div>
    </PageBoundary>
  );
}
