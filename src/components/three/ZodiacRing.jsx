import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function ZodiacRing({ position = [0, 0, -30] }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.008;
      meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[5, 0.25, 16, 100]} />
      <meshPhongMaterial
        color="#FFD700"
        emissive="#FFD700"
        emissiveIntensity={0.3}
        shininess={100}
      />
    </mesh>
  );
}
