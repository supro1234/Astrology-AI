import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../store/useAppStore';
import { verifyAdminSession } from '../db/adminDatabase';

const Welcome           = lazy(() => import('../pages/Welcome'));
const Login             = lazy(() => import('../pages/Login'));
const Home              = lazy(() => import('../pages/Home'));
const BirthChart        = lazy(() => import('../pages/BirthChart'));
const Horoscope         = lazy(() => import('../pages/Horoscope'));
const Panchang          = lazy(() => import('../pages/Panchang'));
const Numerology        = lazy(() => import('../pages/Numerology'));
const Kundali           = lazy(() => import('../pages/Kundali'));
const Match             = lazy(() => import('../pages/Match'));
const Chat              = lazy(() => import('../pages/Chat'));
const Settings          = lazy(() => import('../pages/Settings'));
const PredictionTracker = lazy(() => import('../pages/PredictionTracker'));
const TodoList          = lazy(() => import('../pages/TodoList'));
const Admin             = lazy(() => import('../pages/Admin'));
const AdminLogin        = lazy(() => import('../pages/AdminLogin'));

// ── Cosmic Loading Spinner ───────────────────────────────────────────────────
function CosmicLoader() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '1rem',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: 48, height: 48,
        border: '3px solid rgba(255,215,0,0.15)',
        borderTopColor: '#FFD700',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
        Loading…
      </span>
    </div>
  );
}

// ── 404 Page ──────────────────────────────────────────────────────────────────
function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
      background: 'var(--bg)', color: 'var(--text)',
    }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: '6rem', color: '#FFD700', lineHeight: 1 }}>
        404
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
        This cosmic path does not exist.
      </p>
      <button
        onClick={() => window.history.back()}
        style={{
          background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
          color: '#FFD700', padding: '0.6rem 1.5rem', borderRadius: '50px',
          cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: '0.9rem',
        }}
      >
        ← Return to the Stars
      </button>
    </div>
  );
}

// ─── Page Transition Wrapper ──────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1,    filter: 'blur(0px)' },
  exit:    { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
};

const pageTransition = {
  duration: 0.3,
  ease: 'easeInOut',
};

function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{ width: '100%', minHeight: '100vh' }}
    >
      <Suspense fallback={<CosmicLoader />}>
        {children}
      </Suspense>
    </motion.div>
  );
}

// ─── Protected Route ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ─── Admin-Only Route ─────────────────────────────────────────
// Uses the vault session (Layer 2) — NOT Zustand role.
// Non-admins hit /admin-login, which handles its own vault check.
// Normal users who type /admin are silently sent to home — they
// never see a 403 that confirms /admin even exists.
function AdminRoute({ children }) {
  const [checked, setChecked] = React.useState(false);
  const [hasSession, setHasSession] = React.useState(false);

  React.useEffect(() => {
    verifyAdminSession().then((valid) => {
      setHasSession(valid);
      setChecked(true);
    });
  }, []);

  if (!checked) return null; // blank while checking — no flash

  if (!hasSession) return <Navigate to="/admin-login" replace />;
  return children;
}

// ─── Router ───────────────────────────────────────────────────
export default function AppRouter() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<PageTransition><Welcome /></PageTransition>} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/setup" element={<Navigate to="/home" replace />} />

        {/* Protected routes */}
        <Route path="/home" element={
          <ProtectedRoute><PageTransition><Home /></PageTransition></ProtectedRoute>
        } />
        <Route path="/birth-chart" element={
          <ProtectedRoute><PageTransition><BirthChart /></PageTransition></ProtectedRoute>
        } />
        <Route path="/horoscope" element={
          <ProtectedRoute><PageTransition><Horoscope /></PageTransition></ProtectedRoute>
        } />
        <Route path="/panchang" element={
          <ProtectedRoute><PageTransition><Panchang /></PageTransition></ProtectedRoute>
        } />
        <Route path="/numerology" element={
          <ProtectedRoute><PageTransition><Numerology /></PageTransition></ProtectedRoute>
        } />
        <Route path="/kundali" element={
          <ProtectedRoute><PageTransition><Kundali /></PageTransition></ProtectedRoute>
        } />
        <Route path="/match" element={
          <ProtectedRoute><PageTransition><Match /></PageTransition></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><PageTransition><Chat /></PageTransition></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>
        } />
        <Route path="/predictions" element={
          <ProtectedRoute><PageTransition><PredictionTracker /></PageTransition></ProtectedRoute>
        } />
        <Route path="/todo" element={
          <ProtectedRoute><PageTransition><TodoList /></PageTransition></ProtectedRoute>
        } />

        {/* Admin access */}
        <Route path="/admin-login" element={
          <PageTransition><AdminLogin /></PageTransition>
        } />
        <Route path="/admin" element={
          <AdminRoute><PageTransition><Admin /></PageTransition></AdminRoute>
        } />

        {/* Catch-all → themed 404 (must be last) */}
        <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}
