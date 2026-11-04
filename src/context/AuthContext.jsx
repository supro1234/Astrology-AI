/**
 * AuthContext — backward-compatible thin wrapper around Zustand store.
 * All existing imports of { AuthProvider, useAuth } continue to work.
 */
import React from 'react';
export { useAuth } from '../store/useAppStore';

export function AuthProvider({ children }) {
  // Auth state now lives in Zustand — no provider wrapper needed,
  // but we keep the component so App.jsx doesn't need to change.
  return <>{children}</>;
}
