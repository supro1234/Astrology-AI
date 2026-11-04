import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * GlassCard — 3D Watermelon Physical Glass Card
 * Real depth: multi-layer specular, ambient occlusion, emerald-ruby dual glow on hover.
 * tilt=true enables gyroscopic mouse-track 3D rotation.
 */
export default function GlassCard({
  children,
  className = '',
  tilt = false,
  onClick,
  style = {},
}) {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!tilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rx = ((y - cy) / cy) * -8;
    const ry = ((x - cx) / cx) * 8;
    setTiltStyle({
      transform: `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`,
      transition: 'transform 0.08s ease',
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)',
      transition: 'transform 0.4s cubic-bezier(0.2,0.8,0.2,1)',
    });
    setHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`glass-card ${className}`}
      style={{
        ...tiltStyle,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={hovered && !tilt ? {
        borderColor: 'rgba(0,229,117,0.5)',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.20), inset 0 -1px 0 rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4), 0 0 20px rgba(0,229,117,0.05)',
          'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(0,229,117,0.2), 0 20px 48px rgba(0,0,0,0.6), 0 0 24px rgba(255,42,95,0.2), 0 0 16px rgba(0,229,117,0.15)',
        ],
      } : {}}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
