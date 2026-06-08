import React, { Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRouter from './router/AppRouter';
import BackgroundScene from './components/three/BackgroundScene';
import CursorTrail from './components/ui/CursorTrail';
import FloatingSymbols from './components/ui/FloatingSymbols';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            {/* ── Global 3D Background — persists across all routes ── */}
            <Suspense fallback={null}>
              <BackgroundScene />
            </Suspense>

            {/* ── Floating zodiac symbols — behind content, above canvas ── */}
            <FloatingSymbols />

            {/* ── Golden cursor trail — above everything ── */}
            <CursorTrail />

            {/* ── Page routes with transitions ── */}
            <AppRouter />

            {/* ── Toast notifications ── */}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1A1A2E',
                  color: '#E2E8F0',
                  border: '1px solid rgba(255,215,0,0.2)',
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9rem',
                },
                success: {
                  iconTheme: {
                    primary: '#FFD700',
                    secondary: '#0A0A1A',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f87171',
                    secondary: '#0A0A1A',
                  },
                },
                duration: 3000,
              }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
