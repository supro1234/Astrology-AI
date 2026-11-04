import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { extractDasha, safeStr } from '../../utils/apiHelpers';

export default function DashaCard({ dasha, index = 0 }) {
  const { t } = useLanguage();
  const { maha, antar, mahaEnd, antarEnd } = extractDasha(dasha);

  const tMaha = maha && maha !== '—' ? t(maha) || maha : '—';
  const tAntar = antar && antar !== '—' ? t(antar) || antar : '—';

  return (
    <motion.div
      className="glass-card"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.1 }}
      style={{
        padding: '1.5rem',
        borderLeft: '3px solid var(--primary)',
        background: 'rgba(255,215,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Maha Dasha
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.8rem', color: 'var(--primary)', lineHeight: 1.1 }}>
            {tMaha}
          </div>
          {mahaEnd && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Until {mahaEnd}
            </div>
          )}
        </div>
        <span style={{ fontSize: '2.2rem', opacity: 0.5 }}>🪐</span>
      </div>

      <div
        style={{
          background: 'rgba(192,132,252,0.08)',
          border: '1px solid rgba(192,132,252,0.2)',
          borderRadius: '12px',
          padding: '0.85rem',
        }}
      >
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Antar Dasha
        </div>
        <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '1rem' }}>
          {tAntar}
        </div>
        {antarEnd && (
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Until {antarEnd}
          </div>
        )}
      </div>
    </motion.div>
  );
}
