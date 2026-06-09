/**
 * LanguageContext — backward-compatible thin wrapper around Zustand store.
 * All existing imports of { LanguageProvider, useLanguage } continue to work.
 */
import React from 'react';
export { useLanguage } from '../store/useAppStore';

export function LanguageProvider({ children }) {
  // Language state now lives in Zustand — no React context tree needed.
  return <>{children}</>;
}
