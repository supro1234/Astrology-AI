import React, { Suspense, lazy } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRouter from './router/AppRouter';

const BackgroundScene = lazy(() => import('./components/three/BackgroundScene'));
const CursorTrail = lazy(() => import('./components/ui/CursorTrail'));
const FloatingSymbols = lazy(() => import('./components/ui/FloatingSymbols'));

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
            <Suspense fallback={null}>
              <FloatingSymbols />
            </Suspense>

            {/* ── Golden cursor trail — above everything ── */}
            <Suspense fallback={null}>
              <CursorTrail />
            </Suspense>

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
