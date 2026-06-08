import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../../hooks/useTheme';

const TRAIL_LENGTH = 20;

/**
 * CursorTrail — golden particle dots that follow the mouse cursor.
 * Each dot fades and shrinks based on its age in the trail array.
 * Uses requestAnimationFrame for smooth 60fps movement.
 * pointer-events: none so it never blocks interaction.
 */
export default function CursorTrail() {
  const { isDark, colors } = useTheme();
  const [trail, setTrail] = useState([]);
  const positionsRef = useRef([]);
  const rafRef = useRef(null);
  const frameScheduled = useRef(false);

  const handleMouseMove = useCallback((e) => {
    const newPos = { x: e.clientX, y: e.clientY, id: Date.now() + Math.random() };
    positionsRef.current = [newPos, ...positionsRef.current].slice(0, TRAIL_LENGTH);

    if (!frameScheduled.current) {
      frameScheduled.current = true;
      rafRef.current = requestAnimationFrame(() => {
        setTrail([...positionsRef.current]);
        frameScheduled.current = false;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  const cursorColor = colors.cursorColor;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {trail.map((pos, index) => {
        const age = index / TRAIL_LENGTH; // 0 = newest, 1 = oldest
        const opacity = 1 - age;
        const scale = 1 - age * 0.8;
        const size = 4;

        return (
          <div
            key={pos.id}
            style={{
              position: 'fixed',
              left: pos.x - size / 2,
              top: pos.y - size / 2,
              width: size,
              height: size,
              borderRadius: '50%',
              background: cursorColor,
              boxShadow: `0 0 6px ${cursorColor}`,
              opacity,
              transform: `scale(${scale})`,
              pointerEvents: 'none',
              willChange: 'opacity, transform',
              transition: 'background 0.5s ease, box-shadow 0.5s ease',
            }}
          />
        );
      })}
    </div>
  );
}
