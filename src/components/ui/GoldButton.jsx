import React from 'react';
import { motion } from 'framer-motion';

export default function GoldButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  outline = false,
  className = '',
  type = 'button',
  style = {},
}) {
  return (
    <motion.button
      type={type}
      className={`${outline ? 'btn-outline-gold' : 'btn-gold'} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled ? 1 : 1.03, boxShadow: disabled ? undefined : '0 0 20px rgba(255,215,0,0.5)' }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: 'center',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading && (
        <span
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(0,0,0,0.3)',
            borderTopColor: '#0A0A1A',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      )}
      {children}
    </motion.button>
  );
}
