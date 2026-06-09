import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { extractLagna } from '../utils/apiHelpers';
import { getAscendantReport } from '../api/astrologyApi';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GoldButton from '../components/ui/GoldButton';
import GlassCard from '../components/ui/GlassCard';
import CitySearch from '../components/ui/CitySearch';

const TIMEZONES = Array.from({ length: 53 }, (_, i) => {
  const val = -12 + i * 0.5;
  return { value: val, label: `UTC${val >= 0 ? '+' : ''}${val}` };
});

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

export default function BirthChart() {
  const { t } = useLanguage();
  const { credentials } = useAuth();
  const navigate = useNavigate();

  const existing = storage.getBirthData() || {};
  const [form, setForm] = useState({
    name: existing.name || '',
    date: existing.year ? `${existing.year}-${String(existing.month).padStart(2,'0')}-${String(existing.day).padStart(2,'0')}` : '',
    time: existing.hour !== undefined ? `${String(existing.hour).padStart(2,'0')}:${String(existing.min).padStart(2,'0')}` : '',
    city: existing.city || '',
    lat: existing.lat || '',
    lon: existing.lon || '',
    tzone: existing.tzone ?? 5.5,
  });

  const [saving, setSaving] = useState(false);
  const [lagna, setLagna] = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // State for the main forms
  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSave = async () => {
    if (!form.name || !form.date || !form.time || !form.lat || !form.lon) {
      toast.error('Please fill all required fields');
      return;
    }

    const [year, month, day] = form.date.split('-').map(Number);
    const [hour, min] = form.time.split(':').map(Number);

    const birthData = {
      name: form.name,
      day, month, year,
      hour, min,
      lat: parseFloat(form.lat),
      lon: parseFloat(form.lon),
      tzone: parseFloat(form.tzone),
      city: form.city,
    };

    storage.setBirthData(birthData);
    storage.clearCache();
    setSaving(true);

    try {
      const res = await getAscendantReport(birthData, credentials);
      const lagnaSign = extractLagna(res);
      setLagna(lagnaSign && lagnaSign !== '—' ? lagnaSign : 'Chart saved!');
      toast.success('✨ Birth chart saved!');
    } catch (err) {
      console.error('Ascendant fetch error:', err);
      toast.success('Birth chart saved!');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h1 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 700,
              color: 'var(--primary)',
              marginBottom: '0.5rem',
            }}>
              👤 {t('birth_chart_title')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              Enter your birth details to generate your personal Vedic horoscope
            </p>

            <GlassCard style={{ padding: '2rem', maxWidth: '600px' }}>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                {/* Name */}
                <motion.div variants={itemVariants}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                    {t('full_name')} *
                  </label>
                  <input className="input-gold" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" style={inputStyle} />
                </motion.div>

                {/* Date + Time */}
                <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                      {t('date_of_birth')} *
                    </label>
                    <input type="date" className="input-gold" value={form.date} onChange={(e) => update('date', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                      {t('time_of_birth')} *
                    </label>
                    <input type="time" className="input-gold" value={form.time} onChange={(e) => update('time', e.target.value)} style={inputStyle} />
                  </div>
                </motion.div>

                {/* City Search → Auto Lat/Lon/TZ */}
                <motion.div variants={itemVariants} style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                    {t('city_of_birth')}
                  </label>
                  <CitySearch
                    city={form.city}
                    lat={form.lat}
                    lon={form.lon}
                    tzone={form.tzone}
                    onChange={(fields) => {
                      if (fields.city !== undefined) update('city', fields.city);
                      if (fields.lat !== undefined) update('lat', fields.lat);
                      if (fields.lon !== undefined) update('lon', fields.lon);
                      if (fields.tzone !== undefined) update('tzone', fields.tzone);
                    }}
                  />
                </motion.div>

                {/* Manual overrides (collapsible/optional) */}
                <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                      {t('latitude')} *
                    </label>
                    <input type="number" step="0.000001" className="input-gold" value={form.lat} onChange={(e) => update('lat', e.target.value)} placeholder="e.g., 19.076" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                      {t('longitude')} *
                    </label>
                    <input type="number" step="0.000001" className="input-gold" value={form.lon} onChange={(e) => update('lon', e.target.value)} placeholder="e.g., 72.877" style={inputStyle} />
                  </div>
                </motion.div>

                {/* Timezone */}
                <motion.div variants={itemVariants}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                    {t('timezone')}
                  </label>
                  <select
                    className="input-gold"
                    value={form.tzone}
                    onChange={(e) => update('tzone', e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} style={{ background: 'var(--surface)' }}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </motion.div>

                {/* Save */}
                <motion.div variants={itemVariants}>
                  <GoldButton onClick={handleSave} loading={saving} style={{ width: '100%', fontSize: '1rem', padding: '0.9rem' }}>
                    ✨ {t('save_birth_data')}
                  </GoldButton>
                </motion.div>
              </motion.div>
            </GlassCard>

            {/* Lagna result */}
            {lagna && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  maxWidth: '600px',
                  marginTop: '1.5rem',
                  background: 'rgba(255,215,0,0.06)',
                  borderColor: 'rgba(255,215,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div style={{ fontSize: '2.5rem' }}>⬆️</div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    Your Rising Sign (Lagna)
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--primary)' }}>
                    {lagna}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
