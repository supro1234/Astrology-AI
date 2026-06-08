import React from 'react';

export default function LoadingWheel({ size = 40, color = 'var(--primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid rgba(255,215,0,0.15)`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}
