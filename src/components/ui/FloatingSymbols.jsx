import React, { useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

/**
 * FloatingSymbols — 12 zodiac glyphs that drift upward continuously.
 * Uses the existing .zodiac-char CSS class + zodiacDrift @keyframes from index.css.
 * Fully theme-aware opacity and color.
 * pointer-events: none, zIndex: 0 (behind content, above Three.js canvas).
 */
export default function FloatingSymbols() {
  const { isDark, colors } = useTheme();

  // Randomise per-symbol layout values once on mount
  const symbolConfigs = useMemo(() =>
    ZODIAC_SYMBOLS.map((sym, i) => ({
      sym,
      left: `${5 + Math.random() * 90}%`,
      duration: `${15 + Math.random() * 15}s`,
      delay: `-${Math.random() * 20}s`, // negative delay = already mid-animation on mount
      size: `${1.6 + Math.random() * 0.8}rem`,
    })),
  []);

  const symColor = isDark ? '#FFD700' : '#B8860B';
  const symOpacity = isDark ? 0.12 : 0.08;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {symbolConfigs.map((cfg, i) => (
        <div
          key={i}
          className="zodiac-char"
          style={{
            left: cfg.left,
            top: '110vh',
            fontSize: cfg.size,
            color: symColor,
            opacity: symOpacity,
            animationDuration: cfg.duration,
            animationDelay: cfg.delay,
            filter: `drop-shadow(0 0 6px ${symColor})`,
            userSelect: 'none',
            transition: 'color 0.5s ease, opacity 0.5s ease, filter 0.5s ease',
          }}
        >
          {cfg.sym}
        </div>
      ))}
    </div>
  );
}
