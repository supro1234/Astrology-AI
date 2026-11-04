import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ size = 'md' }) {
  const { dark, toggleTheme } = useTheme();
  const sz = size === 'sm' ? 14 : 18;

  return (
    <motion.button
      onClick={(e) => toggleTheme(e)}
      aria-label="Toggle theme"
      whileHover={{ scale: 1.15, rotate: 15 }}
      whileTap={{ scale: 0.85 }}
      style={{
        background: dark
          ? 'rgba(255,215,0,0.15)'
          : 'rgba(184,134,11,0.15)',
        border: `1px solid var(--border)`,
        borderRadius: '50%',
        width: size === 'sm' ? 32 : 40,
        height: size === 'sm' ? 32 : 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--primary)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={dark ? 'moon' : 'sun'}
          initial={{ y: -20, opacity: 0, rotate: -90 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {dark ? <Moon size={sz} /> : <Sun size={sz} />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
