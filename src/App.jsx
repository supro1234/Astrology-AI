import React, { Suspense, lazy } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRouter from './router/AppRouter';
import SecurityWarning from './components/ui/SecurityWarning';
import BanScreen from './components/ui/BanScreen';
import { useScreenshotBlocker } from './hooks/useScreenshotBlocker';
import { useTabGuard } from './hooks/useTabGuard';
import { useBanGuard } from './hooks/useBanGuard';
import { useAuth } from './context/AuthContext';

const BackgroundScene = lazy(() => import('./components/three/BackgroundScene'));
const CursorTrail = lazy(() => import('./components/ui/CursorTrail'));
const FloatingSymbols = lazy(() => import('./components/ui/FloatingSymbols'));

function SecurityLayer({ onBanTriggered }) {
  const { isAuthenticated } = useAuth();
  useScreenshotBlocker(true);
  useTabGuard(isAuthenticated, onBanTriggered);
  return <SecurityWarning />;
}

/**
 * BanGate — outermost wrapper that checks ban state before rendering any app content.
 * useBanGuard() reads localStorage synchronously so there is zero flash of app content
 * on a banned device (the ban check happens during useState initialisation).
 */
function BanGate({ children }) {
  const { isBanned, ban, deviceId, triggerBanScreen } = useBanGuard();

  if (isBanned) {
    return <BanScreen ban={ban} deviceId={deviceId} />;
  }

  // Clone children and inject triggerBanScreen so SecurityLayer can pass it to useTabGuard
  return React.cloneElement(children, { onBanTriggered: triggerBanScreen });
}

export default function App() {
  return (
    <BrowserRouter>
      <BanGate>
        <AppContent />
      </BanGate>
    </BrowserRouter>
  );
}

function AppContent({ onBanTriggered }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <SecurityLayer onBanTriggered={onBanTriggered} />
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
  );
}
