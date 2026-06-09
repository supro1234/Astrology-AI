import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../../hooks/useTheme';
import ConstellationLines from './ConstellationLines';

// ─── Mobile detection ─────────────────────────────────────────
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

// ─── ELEMENT 1: Star Field ────────────────────────────────────
function StarField({ colors }) {
  const meshRef = useRef();
  const matRef = useRef();
  const count = isMobile ? 1000 : 3000;

  const targetColor = useMemo(() => new THREE.Color(), []);

  const [positions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 2] = Math.random() * -50;
    }
    return [pos];
  }, [count]);

  useFrame((state, delta) => {
    if (matRef.current) {
      targetColor.set(colors.starColor);
      matRef.current.color.lerp(targetColor, delta * 3);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, colors.starOpacity, delta * 3);
    }
    
    if (document.hidden || !meshRef.current) return;
    const pos = meshRef.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.005;
      if (pos[i * 3 + 1] < -100) pos[i * 3 + 1] = 100;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.15}
        color={colors.starColor}
        transparent
        opacity={colors.starOpacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── ELEMENT 2: Wave Mesh ─────────────────────────────────────
function WaveMesh({ colors }) {
  const meshRef = useRef();
  const matRef = useRef();
  const timeRef = useRef(0);
  const segments = isMobile ? 30 : 60;
  const targetColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (matRef.current) {
      targetColor.set(colors.waveColor);
      matRef.current.color.lerp(targetColor, delta * 3);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, colors.waveOpacity, delta * 3);
    }

    if (document.hidden || !meshRef.current) return;
    timeRef.current += 0.008;
    const t = timeRef.current;
    const pos = meshRef.current.geometry.attributes.position;
    const arr = pos.array;
    const colCount = segments + 1;
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= segments; j++) {
        const idx = (i * colCount + j) * 3;
        const x = arr[idx];
        const y = arr[idx + 1];
        arr[idx + 2] = Math.sin(x * 0.05 + t) * 3 + Math.sin(y * 0.05 + t) * 3;
      }
    }
    pos.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -30, -20]}
      rotation={[-Math.PI / 4, 0, 0]}
    >
      <planeGeometry args={[200, 200, segments, segments]} />
      <meshBasicMaterial
        ref={matRef}
        color={colors.waveColor}
        transparent
        opacity={colors.waveOpacity}
        wireframe
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── ELEMENT 3: Floating Planets ──────────────────────────────
function Planet({ position, colorHex, emissiveHex, radius, speed, opacity, phaseOffset = 0 }) {
  const meshRef = useRef();
  const matRef = useRef();
  const t0 = useRef(phaseOffset);
  const targetColor = useMemo(() => new THREE.Color(), []);
  const targetEmissive = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (matRef.current) {
      targetColor.set(colorHex);
      targetEmissive.set(emissiveHex);
      matRef.current.color.lerp(targetColor, delta * 3);
      matRef.current.emissive.lerp(targetEmissive, delta * 3);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, opacity, delta * 3);
    }

    if (document.hidden || !meshRef.current) return;
    meshRef.current.rotation.y += speed;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + t0.current) * 1.5;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshPhongMaterial
        ref={matRef}
        color={colorHex}
        emissive={emissiveHex}
        emissiveIntensity={0.3}
        transparent
        opacity={opacity}
        shininess={60}
      />
    </mesh>
  );
}

// ─── ELEMENT 4: Golden Torus Ring ─────────────────────────────
function TorusRing({ position, colors }) {
  const meshRef = useRef();
  const matRef = useRef();
  const targetColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (matRef.current) {
      targetColor.set(colors.torusColor);
      matRef.current.color.lerp(targetColor, delta * 3);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, colors.torusOpacity, delta * 3);
    }

    if (document.hidden || !meshRef.current) return;
    meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.z += 0.005;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[5, 0.2, 16, 100]} />
      <meshBasicMaterial
        ref={matRef}
        color={colors.torusColor}
        transparent
        opacity={colors.torusOpacity}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── ELEMENT 5: Nebula Glow ───────────────────────────────────
function Nebula({ colors }) {
  const meshRef = useRef();
  const matRef = useRef();
  const count = isMobile ? 200 : 500;
  const targetColor = useMemo(() => new THREE.Color(), []);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3]     = r * Math.cos(theta);
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 2] = r * Math.sin(theta) - 50;
    }
    return pos;
  }, [count]);

  useFrame((state, delta) => {
    if (matRef.current) {
      targetColor.set(colors.nebulaColor);
      matRef.current.color.lerp(targetColor, delta * 3);
      matRef.current.opacity = THREE.MathUtils.lerp(matRef.current.opacity, colors.nebulaOpacity, delta * 3);
    }

    if (document.hidden || !meshRef.current) return;
    meshRef.current.rotation.y += 0.001;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.3}
        color={colors.nebulaColor}
        transparent
        opacity={colors.nebulaOpacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ─── Camera Gentle Oscillation ────────────────────────────────
function CameraRig() {
  const { camera } = useThree();
  useFrame(() => {
    if (document.hidden) return;
    camera.position.x = Math.sin(Date.now() * 0.0001) * 3;
  });
  return null;
}

// ─── Lighting ─────────────────────────────────────────────────
function Lighting({ colors }) {
  const ambientRef = useRef();
  const p1Ref = useRef();
  const p2Ref = useRef();

  const tAmb = useMemo(() => new THREE.Color(), []);
  const tP1 = useMemo(() => new THREE.Color(), []);
  const tP2 = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (ambientRef.current) {
      tAmb.set(colors.ambientColor);
      ambientRef.current.color.lerp(tAmb, delta * 3);
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, colors.ambientIntensity, delta * 3);
    }
    if (p1Ref.current) {
      tP1.set(colors.point1Color);
      p1Ref.current.color.lerp(tP1, delta * 3);
      p1Ref.current.intensity = THREE.MathUtils.lerp(p1Ref.current.intensity, colors.point1Intensity, delta * 3);
    }
    if (p2Ref.current) {
      tP2.set(colors.point2Color);
      p2Ref.current.color.lerp(tP2, delta * 3);
      p2Ref.current.intensity = THREE.MathUtils.lerp(p2Ref.current.intensity, colors.point2Intensity, delta * 3);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} color={colors.ambientColor} intensity={colors.ambientIntensity} />
      <pointLight ref={p1Ref} color={colors.point1Color} intensity={colors.point1Intensity} position={[0, 10, 10]} />
      <pointLight ref={p2Ref} color={colors.point2Color} intensity={colors.point2Intensity} position={[-20, -10, 5]} />
    </>
  );
}

// ─── Full Scene ───────────────────────────────────────────────
function Scene({ isDark, colors }) {
  const planet1Pos = [-25, 10, -60];

  return (
    <>
      <CameraRig />
      <Lighting colors={colors} />
      <StarField colors={colors} />
      <WaveMesh colors={colors} />

      {/* Planet 1 — Gold */}
      <Planet
        position={planet1Pos}
        colorHex={colors.planet1Color}
        emissiveHex={colors.planet1Emissive}
        radius={3}
        speed={0.003}
        opacity={isDark ? 0.9 : 0.7}
        phaseOffset={0}
      />

      {/* Planet 2 — Purple */}
      <Planet
        position={[30, -8, -70]}
        colorHex={colors.planet2Color}
        emissiveHex={colors.planet2Emissive}
        radius={2}
        speed={0.002}
        opacity={isDark ? 0.8 : 0.6}
        phaseOffset={Math.PI / 2}
      />

      {/* Planet 3 — Silver */}
      <Planet
        position={[5, 25, -50]}
        colorHex={colors.planet3Color}
        emissiveHex={colors.planet3Emissive}
        radius={1.5}
        speed={0.004}
        opacity={isDark ? 0.7 : 0.5}
        phaseOffset={Math.PI}
      />

      {/* Torus Ring around Planet 1 */}
      <TorusRing position={planet1Pos} colors={colors} />

      {/* Nebula */}
      <Nebula colors={colors} />

      {/* Constellation Lines */}
      <ConstellationLines isDark={isDark} colors={colors} />
    </>
  );
}

// ─── Root Component ───────────────────────────────────────────
export default function BackgroundScene() {
  const { isDark, colors } = useTheme();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ fov: 75, position: [0, 0, 30] }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
        onCreated={({ scene }) => {
          scene.background = null;
        }}
      >
        <Suspense fallback={null}>
          <Scene isDark={isDark} colors={colors} />
        </Suspense>
      </Canvas>
    </div>
  );
}
