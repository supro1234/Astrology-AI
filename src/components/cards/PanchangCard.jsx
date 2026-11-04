import React from 'react';
import { motion } from 'framer-motion';

export default function PanchangCard({ icon, title, value, meaning, auspicious, index = 0 }) {
  return (
    <motion.div
      className="glass-card-hover"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: index * 0.08 }}
      style={{ padding: '1.25rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.8rem' }}>{icon}</span>
        {auspicious !== undefined && (
          <span className={auspicious ? 'badge-auspicious' : 'badge-inauspicious'}>
            {auspicious ? '✓ Auspicious' : '✗ Inauspicious'}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
        {value || '—'}
      </div>
      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
        {title}
      </div>
      {meaning && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
          {meaning}
        </div>
      )}
    </motion.div>
  );
}
