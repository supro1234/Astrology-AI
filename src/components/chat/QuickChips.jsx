import React from 'react';
import { motion } from 'framer-motion';

const CHIPS = [
  'What is my Lagna?',
  'Current dasha meaning',
  'Career prediction',
  'Marriage timing',
  'Lucky days this month',
  'Health advice',
];

export default function QuickChips({ onSelect }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      padding: '0.75rem',
      borderTop: '1px solid var(--border)',
    }}>
      {CHIPS.map((chip, i) => (
        <motion.button
          key={chip}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.05, borderColor: 'var(--primary)', color: 'var(--primary)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(chip)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '999px',
            padding: '0.35rem 0.85rem',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {chip}
        </motion.button>
      ))}
    </div>
  );
}
