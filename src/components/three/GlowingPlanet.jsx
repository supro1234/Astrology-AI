import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function GlowingPlanet({ position, color, radius = 2, speed = 0.002 }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += speed;
      meshRef.current.rotation.x += speed * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshPhongMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.15}
        shininess={80}
        specular="#ffffff"
      />
    </mesh>
  );
}
