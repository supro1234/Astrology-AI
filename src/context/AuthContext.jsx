import React, { createContext, useContext, useState } from 'react';
import { storage, KEYS } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [credentials, setCredentials] = useState(() => ({
    userId: storage.get(KEYS.USER_ID),
    apiKey: null, // Never read from localStorage
  }));

  const login = (userId, apiKey) => {
    storage.setCredentials(userId, apiKey);
    setCredentials({ userId, apiKey });
  };

  const logout = () => {
    storage.clear();
    setCredentials({ userId: null, apiKey: null });
  };

  // Only require apiKey — userId is optional/display-only
  const isAuthenticated = !!(credentials.apiKey);

  return (
    <AuthContext.Provider value={{ credentials, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
