import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

import Welcome from '../pages/Welcome';
import Setup from '../pages/Setup';
import Home from '../pages/Home';
import BirthChart from '../pages/BirthChart';
import Horoscope from '../pages/Horoscope';
import Panchang from '../pages/Panchang';
import Numerology from '../pages/Numerology';
import Kundali from '../pages/Kundali';
import Match from '../pages/Match';
import Chat from '../pages/Chat';
import Settings from '../pages/Settings';

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
      {children}
    </motion.div>
  );
}

// ─── Protected Route ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/setup" replace />;
  }
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
        <Route path="/setup" element={<PageTransition><Setup /></PageTransition>} />

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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
