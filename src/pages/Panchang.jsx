import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { getTodayParts } from '../utils/dateHelpers';
import { getPanchang } from '../api/astrologyApi';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import PanchangCard from '../components/cards/PanchangCard';
import LoadingWheel from '../components/ui/LoadingWheel';

const PANCHANG_FIELDS = [
  { key: 'tithi', icon: '🌙', titleKey: 'tithi', meaningKey: 'lunar_day' },
  { key: 'nakshatra', icon: '⭐', titleKey: 'nakshatra', meaningKey: 'lunar_mansion' },
  { key: 'yoga', icon: '🔱', titleKey: 'yoga', meaningKey: 'auspicious_combination' },
  { key: 'karana', icon: '🔮', titleKey: 'karana', meaningKey: 'half_lunar_day' },
  { key: 'vara', icon: '📅', titleKey: 'vara', meaningKey: 'day_of_week' },
  { key: 'sunrise', icon: '🌅', titleKey: 'sunrise', meaningKey: 'brahma_muhurta' },
  { key: 'sunset', icon: '🌇', titleKey: 'sunset', meaningKey: 'sandhya_kala' },
];

const AUSPICIOUS_TITHIS = [1, 2, 3, 5, 6, 7, 10, 11, 12, 13];

export default function Panchang() {
  const { t, lang } = useLanguage();
  const { credentials } = useAuth();
  const birthData = storage.getBirthData();

  const [panchang, setPanchang] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = getTodayParts();
  const dateStr = `${today.year}-${today.month}-${today.day}`;

  useEffect(() => {
    const cacheKey = `panchang_${lang}_${dateStr}`;
    const cached = storage.getCacheEntry(cacheKey);
    if (cached) {
      setPanchang(cached);
      return;
    }

    if (!birthData) {
      // Use default location (Delhi)
      fetchPanchang(28.6139, 77.2090, 5.5);
      return;
    }
    fetchPanchang(birthData.lat, birthData.lon, birthData.tzone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, credentials]);

  const fetchPanchang = async (lat, lon, tzone) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPanchang(today, lat, lon, tzone, credentials);
      const cacheKey = `panchang_${lang}_${dateStr}`;
      storage.setCacheEntry(cacheKey, res);
      setPanchang(res);
    } catch (err) {
      console.error('Panchang fetch error:', err);
      setError('Failed to load panchang. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getValue = (key) => {
    if (!panchang) return '—';
    const directMap = {
      tithi: panchang.tithi?.details?.tithi_name || panchang.tithi?.tithi_name || panchang.tithi,
      nakshatra: panchang.nakshatra?.details?.nak_name || panchang.nakshatra?.nak_name || panchang.nakshatra,
      yoga: panchang.yog?.details?.yog_name || panchang.yog?.yog_name || panchang.yoga || panchang.yog,
      karana: panchang.karan?.details?.karan_name || panchang.karan?.karan_name || panchang.karana || panchang.karan,
      vara: panchang.day || panchang.vara,
      sunrise: panchang.sunrise,
      sunset: panchang.sunset,
    };
    return directMap[key] || '—';
  };

  const isAuspicious = (key) => {
    if (key === 'yoga') return panchang?.yog?.details?.special ? true : undefined;
    if (key === 'tithi') {
      const tNum = panchang?.tithi?.details?.tithi_number;
      return tNum ? AUSPICIOUS_TITHIS.includes(tNum) : undefined;
    }
    return undefined;
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              📅 {t('panchang_title')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              {t('today')} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {!birthData && <span style={{ color: '#f87171', marginLeft: '0.5rem' }}>(Using Delhi coordinates)</span>}
            </p>

            {loading && <LoadingWheel size={50} />}

            {error && (
              <div style={{ color: '#f87171', padding: '1rem', textAlign: 'center' }}>{error}</div>
            )}

            {panchang && !loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {PANCHANG_FIELDS.map((field, i) => (
                  <PanchangCard
                    key={field.key}
                    icon={field.icon}
                    title={t(field.titleKey)}
                    value={getValue(field.key)}
                    meaning={t(field.meaningKey)}
                    auspicious={isAuspicious(field.key)}
                    index={i}
                  />
                ))}
              </div>
            )}

            {/* Raw data accordion */}
            {panchang && (
              <motion.div
                className="glass-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: '2rem', padding: '1.5rem' }}
              >
                <h3 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  📊 {t('complete_panchang_data')}
                </h3>
                <pre style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  overflow: 'auto',
                  maxHeight: '200px',
                  lineHeight: 1.6,
                }}>
                  {JSON.stringify(panchang, null, 2)}
                </pre>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
