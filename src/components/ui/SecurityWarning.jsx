import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

export default function SecurityWarning() {
  const securityViolation = useAppStore((state) => state.securityViolation);
  const setSecurityViolation = useAppStore((state) => state.setSecurityViolation);

  if (!securityViolation) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '500px',
        }}
      >
        <div style={{
          background: 'rgba(20, 10, 10, 0.95)', // Very dark reddish tint
          border: '1px solid #ef4444', // Red-500
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '50%',
            padding: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldAlert size={24} color="#ef4444" />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ 
              color: '#ef4444', 
              margin: 0, 
              fontSize: '1.1rem', 
              fontWeight: 700,
              marginBottom: '0.25rem'
            }}>
              Session Ended — Security Protocol Active
            </h3>
            <p style={{ 
              color: '#f87171', // Red-400
              margin: 0, 
              fontSize: '0.9rem',
              lineHeight: 1.4,
              opacity: 0.9
            }}>
              {securityViolation}
            </p>
            <p style={{ 
              color: 'var(--text-muted)', 
              margin: 0, 
              fontSize: '0.75rem',
              marginTop: '0.5rem'
            }}>
              API keys have been securely wiped from memory. You must log in again to continue.
            </p>
          </div>

          <button
            onClick={() => setSecurityViolation(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fca5a5', // Red-300
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#fca5a5'}
          >
            <X size={20} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
