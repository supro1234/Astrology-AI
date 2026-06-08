import React from 'react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '0.75rem' }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'rgba(192,132,252,0.2)',
        border: '1px solid rgba(192,132,252,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', flexShrink: 0,
      }}>
        🔮
      </div>
      <div
        className="chat-bubble-ai"
        style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </motion.div>
  );
}
