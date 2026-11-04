import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * ConstellationLines — 6 zodiac constellation shapes rendered as LineSegments.
 * Fades each constellation in/out on a 10-second cycle.
 * Slowly rotates around Y axis.
 * Receives isDark + colors props from BackgroundScene.
 */

// 6 constellation shapes — each is an array of [x,y,z] star positions.
// Lines connect consecutive pairs (p0→p1, p2→p3, p4→p5, ...).
const CONSTELLATIONS = [
  // Aries
  [[-8,4,-60],[-5,6,-60],[-5,6,-60],[-2,4,-60],[-2,4,-60],[1,5,-60]],
  // Taurus
  [[10,10,-65],[14,12,-65],[14,12,-65],[17,10,-65],[17,10,-65],[20,12,-65],[20,12,-65],[18,8,-65]],
  // Gemini
  [[-20,-5,-70],[-16,-2,-70],[-20,-9,-70],[-16,-6,-70],[-16,-2,-70],[-16,-6,-70]],
  // Leo
  [[5,-12,-55],[8,-8,-55],[8,-8,-55],[12,-10,-55],[12,-10,-55],[15,-8,-55],[15,-8,-55],[13,-14,-55]],
  // Scorpio
  [[-15,14,-58],[-12,12,-58],[-12,12,-58],[-10,14,-58],[-10,14,-58],[-8,11,-58],[-8,11,-58],[-6,13,-58]],
  // Aquarius
  [[18,-5,-62],[22,-8,-62],[22,-8,-62],[26,-5,-62],[26,-5,-62],[30,-8,-62]],
];

// Flatten all line segment pairs into a single Float32Array
function buildLinePositions(constellations) {
  const allPoints = constellations.flat(2);
  return new Float32Array(allPoints);
}

// Star sphere positions (at constellation vertices = every other point in the pair list)
function buildStarPositions(constellations) {
  const stars = [];
  for (const shape of constellations) {
    for (let i = 0; i < shape.length; i++) {
      // Unique points only
      const p = shape[i];
      const key = p.join(',');
      if (!stars.some((s) => s.join(',') === key)) {
        stars.push(p);
      }
    }
  }
  return stars;
}

function SingleConstellation({ points, starPositions, colorHex, opacity, phaseOffset }) {
  const groupRef = useRef();
  const materialRef = useRef();
  const starMatRefs = useRef([]);
  const targetColor = useMemo(() => new THREE.Color(), []);

  const positions = useMemo(() => {
    return new Float32Array(points.flat());
  }, [points]);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    // Each constellation fades in/out on a 10s cycle with its own phase offset
    const raw = Math.sin((t * Math.PI * 2) / 10 + phaseOffset);
    const alpha = ((raw + 1) / 2) * opacity; // map sin [-1,1] → [0, opacity]
    
    targetColor.set(colorHex);

    if (materialRef.current) {
      materialRef.current.color.lerp(targetColor, delta * 3);
      materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, alpha, delta * 3);
    }
    starMatRefs.current.forEach((m) => {
      if (m) {
        m.color.lerp(targetColor, delta * 3);
        m.opacity = THREE.MathUtils.lerp(m.opacity, alpha, delta * 3);
      }
    });
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          ref={materialRef}
          color={colorHex}
          transparent
          opacity={opacity}
          linewidth={1}
        />
      </lineSegments>
      {/* Star spheres at vertices */}
      {starPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial
            ref={(el) => { starMatRefs.current[i] = el; }}
            color={colorHex}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function ConstellationLines({ isDark, colors }) {
  const groupRef = useRef();
  const colorHex = colors?.constellationColor || '#FFD700';
  const opacity = colors?.constellationOpacity || 0.15;

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0003;
    }
  });

  const starSets = useMemo(() => CONSTELLATIONS.map((c) => buildStarPositions([c])), []);

  return (
    <group ref={groupRef}>
      {CONSTELLATIONS.map((shape, i) => (
        <SingleConstellation
          key={i}
          points={shape}
          starPositions={starSets[i]}
          colorHex={colorHex}
          opacity={opacity}
          phaseOffset={(i * Math.PI * 2) / CONSTELLATIONS.length}
        />
      ))}
    </group>
  );
}
