import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, KEYS } from '../utils/storage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = storage.get(KEYS.DARK);
    return stored === null ? true : stored;
  });

  useEffect(() => {
    storage.set(KEYS.DARK, dark);
    const root = document.documentElement;
    if (dark) {
      // Dark mode: add 'dark', remove 'light'
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      // Light mode: add 'light', remove 'dark'
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [dark]);

  // Apply initial class immediately on mount (before first paint)
  useEffect(() => {
    const root = document.documentElement;
    const stored = storage.get(KEYS.DARK);
    const isDark = stored === null ? true : stored;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, []);

  const toggleTheme = (event) => {
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;

    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple';
    overlay.style.setProperty('--ripple-x', `${x}px`);
    overlay.style.setProperty('--ripple-y', `${y}px`);
    overlay.style.background = dark ? '#FFFDF5' : '#0A0A1A';
    document.body.appendChild(overlay);

    setTimeout(() => setDark((d) => !d), 180);
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 700);
  };

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
