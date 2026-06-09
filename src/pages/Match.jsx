import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapPin, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { getMatchMaking } from '../api/astrologyApi';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GoldButton from '../components/ui/GoldButton';
import GlassCard from '../components/ui/GlassCard';
import LoadingWheel from '../components/ui/LoadingWheel';
import CitySearch from '../components/ui/CitySearch';

const TIMEZONES = Array.from({ length: 53 }, (_, i) => {
  const val = -12 + i * 0.5;
  return { value: val, label: `UTC${val >= 0 ? '+' : ''}${val}` };
});

const KUTAS = [
  { key: 'varna', labelKey: 'kuta_varna', max: 1, descKey: 'kuta_varna_desc' },
  { key: 'vasya', labelKey: 'kuta_vasya', max: 2, descKey: 'kuta_vasya_desc' },
  { key: 'tara', labelKey: 'kuta_tara', max: 3, descKey: 'kuta_tara_desc' },
  { key: 'yoni', labelKey: 'kuta_yoni', max: 4, descKey: 'kuta_yoni_desc' },
  { key: 'maitri', labelKey: 'kuta_maitri', max: 5, descKey: 'kuta_maitri_desc' },
  { key: 'gana', labelKey: 'kuta_gana', max: 6, descKey: 'kuta_gana_desc' },
  { key: 'bhakut', labelKey: 'kuta_bhakut', max: 7, descKey: 'kuta_bhakut_desc' },
  { key: 'nadi', labelKey: 'kuta_nadi', max: 8, descKey: 'kuta_nadi_desc' },
];

// Imported CitySearch is used below

function PersonForm({ title, form, onChange }) {
  const inputStyle = { padding: '0.6rem 0.8rem', fontSize: '0.85rem' };
  const up = (fields) => onChange({ ...form, ...fields });

  return (
    <GlassCard style={{ padding: '1.5rem' }}>
      <h3 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '1.25rem', fontSize: '1rem' }}>
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input className="input-gold" value={form.name} onChange={(e) => up({ name: e.target.value })} placeholder="Name" style={inputStyle} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <input type="date" className="input-gold" value={form.date} onChange={(e) => up({ date: e.target.value })} style={inputStyle} />
          <input type="time" className="input-gold" value={form.time} onChange={(e) => up({ time: e.target.value })} style={inputStyle} />
        </div>

        {/* City search → auto lat/lon */}
        <CitySearch
          city={form.city}
          lat={form.lat}
          lon={form.lon}
          tzone={form.tzone}
          onChange={(fields) => up(fields)}
        />

        {/* Manual overrides (collapsible) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          <input
            type="number" step="0.0001" className="input-gold"
            value={form.lat} onChange={(e) => up({ lat: e.target.value })}
            placeholder="Latitude" style={inputStyle}
          />
          <input
            type="number" step="0.0001" className="input-gold"
            value={form.lon} onChange={(e) => up({ lon: e.target.value })}
            placeholder="Longitude" style={inputStyle}
          />
        </div>

        <select className="input-gold" value={form.tzone} onChange={(e) => up({ tzone: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value} style={{ background: 'var(--surface)' }}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
    </GlassCard>
  );
}




function CircularScore({ score, max = 36 }) {
  const { t } = useLanguage();
  const pct = score / max;
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct);
  const color = score >= 18 ? '#4ade80' : score >= 12 ? '#FACC15' : '#f87171';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          transform="rotate(-90 70 70)"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="900" fontFamily="Cinzel, serif">
          {score}
        </text>
        <text x="70" y="85" textAnchor="middle" fill="#94A3B8" fontSize="11">
          {t('out_of')} {max}
        </text>
      </svg>
      <div style={{
        marginTop: '0.5rem', fontWeight: 700, fontSize: '0.9rem',
        color: color,
      }}>
        {score >= 18 ? t('compatible') : score >= 12 ? t('moderate') : t('challenging')}
      </div>
    </div>
  );
}

const defaultForm = { name: '', date: '', time: '12:00', lat: '', lon: '', tzone: 5.5 };

export default function Match() {
  const { t } = useLanguage();
  const { credentials } = useAuth();
  const birth = storage.getBirthData();

  const [p1, setP1] = useState({ ...defaultForm, name: birth?.name || '', lat: birth?.lat || '', lon: birth?.lon || '', tzone: birth?.tzone || 5.5, date: birth?.year ? `${birth.year}-${String(birth.month).padStart(2,'0')}-${String(birth.day).padStart(2,'0')}` : '', time: birth?.hour !== undefined ? `${String(birth.hour).padStart(2,'0')}:${String(birth.min).padStart(2,'0')}` : '12:00' });
  const [p2, setP2] = useState({ ...defaultForm });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const parsePerson = (p) => {
    const [year, month, day] = p.date.split('-').map(Number);
    const [hour, min] = p.time.split(':').map(Number);
    return { day, month, year, hour, min, lat: parseFloat(p.lat), lon: parseFloat(p.lon), tzone: parseFloat(p.tzone) };
  };

  const handleMatch = async () => {
    if (!p1.date || !p2.date || !p1.lat || !p2.lat) {
      toast.error('Please fill both partners\' birth details');
      return;
    }
    setLoading(true);
    try {
      const res = await getMatchMaking(parsePerson(p1), parsePerson(p2), credentials);
      setResult(res);
    } catch (err) {
      toast.error('Match calculation failed: ' + (err?.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalScore = result?.score || result?.total_score || result?.ashtakoot_score || 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              💑 {t('match_title')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              {t('match_desc')}
            </p>

            {/* Forms */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <PersonForm title={`💑 ${t('partner1')}`} form={p1} onChange={setP1} />
              <PersonForm title={`💑 ${t('partner2')}`} form={p2} onChange={setP2} />
            </div>

            <GoldButton onClick={handleMatch} loading={loading} style={{ width: '100%', maxWidth: '400px', fontSize: '1rem', padding: '1rem', marginBottom: '2rem' }}>
              💑 {t('calculate_match')}
            </GoldButton>

            {loading && <LoadingWheel size={50} />}

            {result && !loading && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring' }}>
                  {/* Score */}
                  <GlassCard style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontFamily: 'Cinzel, serif', color: 'var(--primary)', marginBottom: '1.5rem' }}>
                      {t('compatibility')}
                    </h2>
                    <CircularScore score={totalScore} />
                    {result?.conclusion && (
                      <p style={{ color: 'var(--text)', marginTop: '1.5rem', lineHeight: 1.7, maxWidth: '500px', margin: '1.5rem auto 0' }}>
                        {result.conclusion}
                      </p>
                    )}
                  </GlassCard>

                  {/* Kuta scores */}
                  <h3 style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '1rem' }}>
                    {t('kuta_analysis')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {KUTAS.map((kuta, i) => {
                      const gotScore = result?.[kuta.key]?.score || result?.[kuta.key + '_score'] || 0;
                      const pct = gotScore / kuta.max;
                      const color = pct >= 0.6 ? '#4ade80' : pct >= 0.4 ? '#FACC15' : '#f87171';
                      return (
                        <motion.div
                          key={kuta.key}
                          className="glass-card"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                          style={{ padding: '1rem' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t(kuta.labelKey)}</span>
                            <span style={{ fontWeight: 700, color }}>
                              {gotScore}/{kuta.max}
                            </span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct * 100}%` }}
                              transition={{ duration: 1, delay: i * 0.06 }}
                              style={{ height: '100%', background: color, borderRadius: '2px' }}
                            />
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                            {t(kuta.descKey)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
