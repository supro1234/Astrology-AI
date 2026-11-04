import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { extractPlanet, safeStr } from '../../utils/apiHelpers';

const PLANET_META = {
  Sun:     { emoji: '☀️', color: '#FFD700', bg: 'rgba(255,215,0,0.07)' },
  Moon:    { emoji: '🌙', color: '#C0C0C0', bg: 'rgba(192,192,192,0.07)' },
  Mars:    { emoji: '♂️', color: '#FF4444', bg: 'rgba(255,68,68,0.07)' },
  Mercury: { emoji: '☿',  color: '#4ADE80', bg: 'rgba(74,222,128,0.07)' },
  Jupiter: { emoji: '♃',  color: '#FACC15', bg: 'rgba(250,204,21,0.07)' },
  Venus:   { emoji: '♀',  color: '#F9A8D4', bg: 'rgba(249,168,212,0.07)' },
  Saturn:  { emoji: '♄',  color: '#818CF8', bg: 'rgba(129,140,248,0.07)' },
  Rahu:    { emoji: '☊',  color: '#9CA3AF', bg: 'rgba(156,163,175,0.07)' },
  Ketu:    { emoji: '☋',  color: '#DC2626', bg: 'rgba(220,38,38,0.07)' },
};

export default function PlanetCard({ planet: rawPlanet, index = 0 }) {
  const { t } = useLanguage();
  
  // extractPlanet safely handles any API response shape
  const p = extractPlanet(rawPlanet) || {};
  const name    = p.name || safeStr(rawPlanet?.name || rawPlanet?.planet_name) || 'Planet';
  const sign    = p.sign || '—';
  const house   = p.house || '—';
  const isRetro = p.isRetro;
  const degree  = p.degree;

  // get report string safely
  const rawReport = rawPlanet?.report || rawPlanet?.prediction || rawPlanet?.description;
  const report = safeStr(rawReport) || '';

  const tName = t(name) || name;
  const tSign = t(sign) || sign;
  const tHouse = house !== '—' ? `${t('house_num') || 'House'} ${house}` : '—';

  const meta = PLANET_META[name] || { emoji: '⭐', color: 'var(--primary)', bg: 'rgba(255,215,0,0.05)' };

  return (
    <motion.div
      className="flip-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.07 }}
      style={{ height: '200px' }}
    >
      <div className="flip-card-inner" style={{ height: '100%' }}>
        {/* Front */}
        <div
          className="glass-card flip-card-front"
          style={{
            height: '100%',
            padding: '1.25rem',
            background: meta.bg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '2.2rem', filter: `drop-shadow(0 0 8px ${meta.color}44)` }}>
              {meta.emoji}
            </span>
            {isRetro && (
              <span style={{
                fontSize: '0.62rem',
                background: 'rgba(192,132,252,0.2)',
                color: '#c084fc',
                border: '1px solid rgba(192,132,252,0.3)',
                borderRadius: '999px',
                padding: '0.15rem 0.5rem',
              }}>
                ℞ {t('retro') || 'Retro'}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>{tName}</div>
            <div style={{ color: meta.color, fontSize: '0.95rem', marginTop: '0.15rem', fontWeight: 600 }}>
              {tSign}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.15rem' }}>
              {tHouse}
              {degree && <span style={{ marginLeft: '0.4rem' }}>· {degree}°</span>}
            </div>
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', opacity: 0.5 }}>
            {t('hover_report') || 'Hover to see report →'}
          </div>
        </div>

        {/* Back */}
        <div
          className="glass-card flip-card-back"
          style={{
            height: '100%',
            padding: '1rem',
            background: 'rgba(192,132,252,0.08)',
            border: '1px solid rgba(192,132,252,0.2)',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
            {meta.emoji} {tName} - {tSign}
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text)',
            lineHeight: 1.65,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 7,
            WebkitBoxOrient: 'vertical',
          }}>
            {report || (t('planet_report_template') || `${tName} is placed in ${tSign}${house !== '—' ? `, ${tHouse}` : ''}. This placement brings unique influences to your natal chart and life journey based on Vedic principles.`)
                .replace('{planet}', tName)
                .replace('{sign}', tSign)
                .replace('{house}', house !== '—' ? `${t('house_num')} ${house}` : '')}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
