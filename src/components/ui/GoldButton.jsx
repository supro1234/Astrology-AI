import React from 'react';
import { motion } from 'framer-motion';

/**
 * GoldButton — 3D Watermelon Ruby Tactile Button
 * Physical depth: ruby red gradient + inset extrusion + specular highlight
 * NOT gold anymore — renamed "Gold" for backward compat but is now ruby/watermelon.
 */
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
      whileHover={disabled ? {} : {
        scale: 1.03,
        boxShadow: '0 8px 28px rgba(255,42,95,0.65), 0 3px 0 #8B0020, inset 0 1px 0 rgba(255,255,255,0.35)',
      }}
      whileTap={disabled ? {} : {
        scale: 0.96,
        y: 2,
        boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.4), 0 1px 0 #8B0020',
      }}
      style={{
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        justifyContent: 'center',
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading && (
        <span style={{
          width: 16, height: 16,
          border: '2px solid rgba(255,255,255,0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {children}
    </motion.button>
  );
}
