import React, { createContext, useContext, useState } from 'react';
import { storage, KEYS } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [credentials, setCredentials] = useState(() => ({
    userId: storage.get(KEYS.USER_ID),
    apiKey: null,      // AstrologyAPI key — NEVER persisted to localStorage
    openRouterKey: null,   // OpenRouter key — NEVER persisted to localStorage
  }));

  const login = (userId, apiKey, openRouterKey) => {
    storage.setCredentials(userId, apiKey);
    setCredentials({ userId, apiKey, openRouterKey: openRouterKey || null });
  };

  /**
   * Update just the OpenRouter key without re-verifying AstrologyAPI credentials
   */
  const setOpenRouterKey = (openRouterKey) => {
    setCredentials(prev => ({ ...prev, openRouterKey }));
  };

  const logout = () => {
    storage.clear();
    setCredentials({ userId: null, apiKey: null, openRouterKey: null });
  };

  // Only require apiKey — userId is optional/display-only
  const isAuthenticated = !!(credentials.apiKey);

  return (
    <AuthContext.Provider value={{ credentials, login, logout, isAuthenticated, setOpenRouterKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
