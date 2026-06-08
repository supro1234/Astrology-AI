/**
 * useTheme — wraps ThemeContext and provides a full color palette
 * for use in Three.js scenes, CSS effects, and other components.
 */
import { useTheme as useThemeCtx } from '../context/ThemeContext';

const DARK_COLORS = {
  primary: '#FFD700',
  accent: '#C084FC',
  bg: '#0A0A1A',
  particle: '#FFFFFF',
  starColor: '#FFFFFF',
  starOpacity: 0.8,
  waveColor: '#FFD700',
  waveOpacity: 0.08,
  planet1Color: '#FFD700',
  planet1Emissive: '#FF8C00',
  planet2Color: '#C084FC',
  planet2Emissive: '#7C3AED',
  planet3Color: '#94A3B8',
  planet3Emissive: '#475569',
  torusColor: '#FFD700',
  torusOpacity: 0.6,
  nebulaColor: '#C084FC',
  nebulaOpacity: 0.15,
  constellationColor: '#FFD700',
  constellationOpacity: 0.15,
  ambientColor: '#1a1a2e',
  ambientIntensity: 0.5,
  point1Color: '#FFD700',
  point1Intensity: 2,
  point2Color: '#C084FC',
  point2Intensity: 1,
  cursorColor: '#FFD700',
  symbolColor: 'rgba(255,215,0,0.12)',
};

const LIGHT_COLORS = {
  primary: '#B8860B',
  accent: '#7C3AED',
  bg: '#FFFDF5',
  particle: '#B8860B',
  starColor: '#B8860B',
  starOpacity: 0.4,
  waveColor: '#B8860B',
  waveOpacity: 0.06,
  planet1Color: '#B8860B',
  planet1Emissive: '#8B6914',
  planet2Color: '#7C3AED',
  planet2Emissive: '#4C1D95',
  planet3Color: '#64748B',
  planet3Emissive: '#334155',
  torusColor: '#B8860B',
  torusOpacity: 0.4,
  nebulaColor: '#7C3AED',
  nebulaOpacity: 0.06,
  constellationColor: '#B8860B',
  constellationOpacity: 0.08,
  ambientColor: '#FFF8E7',
  ambientIntensity: 0.8,
  point1Color: '#B8860B',
  point1Intensity: 1.5,
  point2Color: '#7C3AED',
  point2Intensity: 0.5,
  cursorColor: '#B8860B',
  symbolColor: 'rgba(184,134,11,0.08)',
};

export function useTheme() {
  const { dark, toggleTheme } = useThemeCtx();
  return {
    isDark: dark,
    toggleTheme,
    colors: dark ? DARK_COLORS : LIGHT_COLORS,
  };
}

export default useTheme;
