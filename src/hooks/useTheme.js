/**
 * useTheme — wraps ThemeContext and provides a full color palette
 * for use in Three.js scenes, CSS effects, and other components.
 */
import { useTheme as useThemeCtx } from '../context/ThemeContext';

const DARK_COLORS = {
  primary: '#FF2A5F',            // Juicy Watermelon Red/Pink
  accent: '#00E575',             // Crisp Emerald Rind Green
  bg: '#080D0A',                 // Deep Obsidian Rind Night
  surface: '#0F1712',            // Dark Rind Glass Layer
  surface2: '#16231B',           // Elevated 3D Layer
  particle: '#FF4D79',
  starColor: '#F4FFF8',
  starOpacity: 0.85,
  waveColor: '#00E575',          // Emerald Cosmic Wave Grid
  waveOpacity: 0.12,
  planet1Color: '#FF2A5F',       // 3D Ruby Watermelon Core Planet
  planet1Emissive: '#D90040',
  planet2Color: '#00E575',       // 3D Emerald Rind Planet
  planet2Emissive: '#008F47',
  planet3Color: '#FF85A1',       // 3D Coral Moon
  planet3Emissive: '#C72A52',
  torusColor: '#00E575',         // Glowing Emerald Orbital Ring
  torusOpacity: 0.7,
  nebulaColor: '#FF2A5F',        // Cosmic Watermelon Nebula
  nebulaOpacity: 0.22,
  constellationColor: '#00E575', // Living Emerald Constellation Lines
  constellationOpacity: 0.22,
  ambientColor: '#0C1A12',
  ambientIntensity: 0.7,
  point1Color: '#FF2A5F',        // Ruby Specular Light
  point1Intensity: 2.8,
  point2Color: '#00E575',        // Emerald Accent Light
  point2Intensity: 2.0,
  cursorColor: '#FF2A5F',
  symbolColor: 'rgba(255,42,95,0.18)',
};

const LIGHT_COLORS = {
  primary: '#E61C53',
  accent: '#00B359',
  bg: '#F8FCFA',
  surface: '#EEF7F2',
  surface2: '#E2F1E9',
  particle: '#E61C53',
  starColor: '#00B359',
  starOpacity: 0.45,
  waveColor: '#00B359',
  waveOpacity: 0.08,
  planet1Color: '#E61C53',
  planet1Emissive: '#A30D35',
  planet2Color: '#00B359',
  planet2Emissive: '#006633',
  planet3Color: '#E27B94',
  planet3Emissive: '#8C2E46',
  torusColor: '#00B359',
  torusOpacity: 0.5,
  nebulaColor: '#E61C53',
  nebulaOpacity: 0.08,
  constellationColor: '#00B359',
  constellationOpacity: 0.12,
  ambientColor: '#F0F9F4',
  ambientIntensity: 0.9,
  point1Color: '#E61C53',
  point1Intensity: 2.0,
  point2Color: '#00B359',
  point2Intensity: 1.2,
  cursorColor: '#E61C53',
  symbolColor: 'rgba(230,28,83,0.12)',
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
