import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

function Starfield({ isDark }) {
  const ref = useRef();

  // Generate random positions for 3000 stars
  const positions = useMemo(() => {
    const coords = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const r = 20 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      coords[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      coords[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      coords[i * 3 + 2] = r * Math.cos(phi);
    }
    return coords;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={isDark ? '#FFD700' : '#8B5CF6'}
          size={0.05}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={isDark ? 0.6 : 0.4}
        />
      </Points>
    </group>
  );
}

export default function CosmicBackground() {
  const { dark } = useTheme();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: -1,
      pointerEvents: 'none',
      background: 'var(--bg)',
      transition: 'background 0.3s ease'
    }}>
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Starfield isDark={dark} />
      </Canvas>
    </div>
  );
}
