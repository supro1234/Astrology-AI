/**
 * ThemeContext — backward-compatible thin wrapper around Zustand store.
 * All existing imports of { ThemeProvider, useTheme } continue to work.
 *
 * Theme DOM class is applied in two places:
 *  1. main.jsx — before first render (prevents flash)
 *  2. toggleTheme() in useAppStore — on user toggle
 * No useEffect needed here — removing it eliminates the infinite loop risk.
 */
export { useTheme } from '../store/useAppStore';

export function ThemeProvider({ children }) {
  // State lives entirely in Zustand — this wrapper only exists
  // for backward-compatibility with the existing import paths.
  return <>{children}</>;
}
