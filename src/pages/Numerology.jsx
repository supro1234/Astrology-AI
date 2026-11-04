import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import { storage } from '../utils/storage';
import {
  calcLifePath, calcExpression, calcSoulUrge, calcPersonality,
  calcBirthday, calcPersonalYear, NUMEROLOGY_INFO
} from '../utils/dateHelpers';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GoldButton from '../components/ui/GoldButton';
import GlassCard from '../components/ui/GlassCard';

function NumberCard({ label, number, delay = 0 }) {
  const { t } = useLanguage();
  const info = NUMEROLOGY_INFO[number] || { name: '—', meaning: '—', planet: '—', luckyColor: '—', luckyDay: '—' };
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay * 1000 + 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      className="glass-card-hover"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
      style={{ padding: '1.5rem' }}
    >
      {/* Number display */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <motion.div
          key={number}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: delay + 0.1 }}
          style={{
            fontSize: '4rem',
            fontWeight: 900,
            fontFamily: 'Cinzel, serif',
            color: 'var(--primary)',
            textShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)',
            lineHeight: 1,
            marginBottom: '0.5rem',
          }}
        >
          {number}
        </motion.div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {label}
        </div>
        <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {t(`num_${number}_name`) !== `num_${number}_name` ? t(`num_${number}_name`) : info.name}
        </div>
      </div>

      {/* Info */}
      <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '1rem' }}>
        {t(`num_${number}_meaning`) !== `num_${number}_meaning` ? t(`num_${number}_meaning`) : info.meaning}
      </p>

      {/* Meta */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)',
          borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--primary)',
        }}>
          {info.planet}
        </span>
        <span style={{
          background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)',
          borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--accent)',
        }}>
          🗓 {info.luckyDay}
        </span>
        <span style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
          borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', color: 'var(--text-muted)',
        }}>
          🎨 {info.luckyColor}
        </span>
      </div>
    </motion.div>
  );
}

export default function Numerology() {
  const { t } = useLanguage();
  const birthData = storage.getBirthData();

  const [form, setForm] = useState({
    name: birthData?.name || '',
    day: birthData?.day || '',
    month: birthData?.month || '',
    year: birthData?.year || '',
  });

  const [results, setResults] = useState(null);

  const calculate = () => {
    const { name, day, month, year } = form;
    if (!name || !day || !month || !year) return;

    setResults({
      lifePath: calcLifePath(Number(day), Number(month), Number(year)),
      expression: calcExpression(name),
      soulUrge: calcSoulUrge(name),
      personality: calcPersonality(name),
      birthday: calcBirthday(Number(day)),
      personalYear: calcPersonalYear(Number(day), Number(month)),
    });
  };

  // Auto-calculate if prefilled
  useEffect(() => {
    if (form.name && form.day && form.month && form.year) {
      calculate();
    }
  }, []);

  const update = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
              🔢 {t('numerology_title')}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
              {t('numerology_desc')}
            </p>

            {/* Input form */}
            <GlassCard style={{ padding: '1.5rem', maxWidth: '500px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 500 }}>
                    {t('full_name_numerology')}
                  </label>
                  <input className="input-gold" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your full name" style={{ padding: '0.75rem 1rem' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('day')}</label>
                    <input type="number" min="1" max="31" className="input-gold" value={form.day} onChange={(e) => update('day', e.target.value)} placeholder="DD" style={{ padding: '0.65rem 0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('month')}</label>
                    <input type="number" min="1" max="12" className="input-gold" value={form.month} onChange={(e) => update('month', e.target.value)} placeholder="MM" style={{ padding: '0.65rem 0.75rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('year')}</label>
                    <input type="number" className="input-gold" value={form.year} onChange={(e) => update('year', e.target.value)} placeholder="YYYY" style={{ padding: '0.65rem 0.75rem' }} />
                  </div>
                </div>
                <GoldButton onClick={calculate} style={{ width: '100%' }}>
                  🔢 {t('calculate')}
                </GoldButton>
              </div>
            </GlassCard>

            {/* Results */}
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}
                >
                  <NumberCard label={t('life_path_number')} number={results.lifePath} delay={0} />
                  <NumberCard label={t('expression_number')} number={results.expression} delay={0.1} />
                  <NumberCard label={t('soul_urge_number')} number={results.soulUrge} delay={0.2} />
                  <NumberCard label={t('personality_number')} number={results.personality} delay={0.3} />
                  <NumberCard label={t('birthday_number')} number={results.birthday} delay={0.4} />
                  <NumberCard label={t('personal_year_number')} number={results.personalYear} delay={0.5} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compatibility & Forecast */}
            <AnimatePresence>
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}
                >
                  {/* Compatibility */}
                  <GlassCard style={{ flex: 1, minWidth: '300px', padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: 600 }}>
                      💞 Relationship Compatibility
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Based on your Life Path Number ({results.lifePath}):
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#4ade80', marginBottom: '0.25rem', fontWeight: 600 }}>Most Compatible With</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[1, 5, 7].map(n => (
                            <span key={n} style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>{n}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '0.25rem', fontWeight: 600 }}>Challenging Matches</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {[2, 4, 6].map(n => (
                            <span key={n} style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>{n}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Monthly Forecast */}
                  <GlassCard style={{ flex: 1, minWidth: '300px', padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '1rem', fontWeight: 600 }}>
                      📅 Monthly Forecast
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Your Personal Month Number for {new Date().toLocaleString('default', { month: 'long' })} is:
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)', 
                        background: 'rgba(192,132,252,0.1)', width: '60px', height: '60px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' 
                      }}>
                        {((results.personalYear + new Date().getMonth() + 1) % 9) || 9}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                          A time for new beginnings and initiative.
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          Focus on personal goals, start new projects, and take charge of your life direction this month.
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
