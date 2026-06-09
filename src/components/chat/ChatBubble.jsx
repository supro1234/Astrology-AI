import React from 'react';
import { motion } from 'framer-motion';

export default function ChatBubble({ message, isUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '0.75rem',
        alignItems: 'flex-end',
        gap: '0.5rem',
      }}
    >
      {!isUser && (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(192,132,252,0.2)',
          border: '1px solid rgba(192,132,252,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
        }}>
          🔮
        </div>
      )}

      <div
        className={isUser ? 'chat-bubble-user' : 'chat-bubble-ai'}
        style={{
          maxWidth: '85%',
          padding: '0.75rem 1rem',
          lineHeight: 1.6,
          fontSize: '0.9rem',
          color: 'var(--text)',
          wordBreak: 'break-word',
        }}
      >
        <div 
          dangerouslySetInnerHTML={{ 
            __html: message.text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\n/g, '<br />') 
          }} 
        />
        <div style={{
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          marginTop: '0.4rem',
          textAlign: isUser ? 'right' : 'left',
        }}>
          {message.time}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255,215,0,0.2)',
          border: '1px solid rgba(255,215,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
        }}>
          👤
        </div>
      )}
    </motion.div>
  );
}
