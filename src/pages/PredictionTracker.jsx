import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Trash2, Download, BarChart2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllPredictions,
  logOutcome,
  deletePrediction,
  getAccuracyStats,
  exportPredictions,
  clearAllPredictions,
} from '../utils/predictionDB';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GoldButton from '../components/ui/GoldButton';

const TYPE_CONFIG = {
  career:       { icon: '💼', color: '#3B82F6', label: 'Career' },
  love:         { icon: '❤️', color: '#EC4899', label: 'Love' },
  health:       { icon: '🌿', color: '#10B981', label: 'Health' },
  finance:      { icon: '💰', color: '#F59E0B', label: 'Finance' },
  family:       { icon: '🏠', color: '#8B5CF6', label: 'Family' },
  spirituality: { icon: '🧘', color: '#06B6D4', label: 'Spirituality' },
  general:      { icon: '🔮', color: '#FFD700', label: 'General' },
};

function AccuracyRing({ percent, label, color }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const stroke = percent != null ? (percent / 100) * circ : 0;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        {percent != null && (
          <circle
            cx="30" cy="30" r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${stroke} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        )}
        <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
          {percent != null ? `${percent}%` : '—'}
        </text>
      </svg>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}

function PredictionCard({ pred, onOutcome, onDelete }) {
  const cfg   = TYPE_CONFIG[pred.type] || TYPE_CONFIG.general;
  const date  = new Date(pred.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="glass-card"
      style={{ padding: '1.15rem 1.25rem', borderLeft: `3px solid ${cfg.color}`, marginBottom: '0.65rem' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
            <span style={{ fontWeight: 700, color: cfg.color, fontSize: '0.82rem' }}>{cfg.label}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{date}</span>
            {pred.confidence && (
              <span style={{
                fontSize: '0.65rem',
                color: pred.confidence >= 0.75 ? '#4ade80' : '#FFD700',
                background: pred.confidence >= 0.75 ? 'rgba(74,222,128,0.12)' : 'rgba(255,215,0,0.12)',
                borderRadius: '999px', padding: '0.1rem 0.45rem', fontWeight: 700,
              }}>
                {Math.round(pred.confidence * 100)}% conf.
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.65, margin: 0 }}>
            {pred.text.length > 220 ? pred.text.slice(0, 220) + '…' : pred.text}
          </p>
          {pred.outcomeText && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              📝 {pred.outcomeText}
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          {pred.status === 'pending'   && <Clock   size={18} style={{ color: '#FFD700' }} />}
          {pred.status === 'accurate'  && <CheckCircle size={18} style={{ color: '#4ade80' }} />}
          {pred.status === 'inaccurate'&& <XCircle  size={18} style={{ color: '#f87171' }} />}
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            {pred.status}
          </span>
        </div>
      </div>

      {/* Action buttons — only for pending */}
      {pred.status === 'pending' && (
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onOutcome(pred.id, 'accurate', 'Came true!')}
            style={{
              background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '8px', padding: '0.35rem 0.75rem', color: '#4ade80',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            <CheckCircle size={12} /> Came True ✓
          </button>
          <button
            onClick={() => onOutcome(pred.id, 'inaccurate', 'Did not happen')}
            style={{
              background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: '8px', padding: '0.35rem 0.75rem', color: '#f87171',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '0.3rem',
            }}
          >
            <XCircle size={12} /> Didn't Happen
          </button>
          <button
            onClick={() => onDelete(pred.id)}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.35rem 0.65rem', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '0.75rem',
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function PredictionTracker() {
  const navigate = useNavigate();
  const { t }    = useLanguage();
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats]             = useState(null);
  const [filter, setFilter]           = useState('all'); // 'all' | 'pending' | 'accurate' | 'inaccurate'
  const [loading, setLoading]         = useState(true);

  const reload = async () => {
    setLoading(true);
    const [all, st] = await Promise.all([getAllPredictions(), getAccuracyStats()]);
    setPredictions(all);
    setStats(st);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleOutcome = async (id, status, text) => {
    await logOutcome(id, status, text);
    reload();
  };

  const handleDelete = async (id) => {
    await deletePrediction(id);
    reload();
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all prediction history? This cannot be undone.')) {
      await clearAllPredictions();
      reload();
    }
  };

  const filtered = predictions.filter(p => filter === 'all' || p.status === filter);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Header */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.35rem' }}>
                📊 Prediction Tracker
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Track your horoscope predictions and measure accuracy over time
              </p>
            </div>

            {/* Stats overview */}
            {stats && stats.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Overall Accuracy
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {stats.total} predictions · {stats.pending} pending
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', justifyContent: 'center', paddingBottom: '0.25rem' }}>
                  <AccuracyRing percent={stats.accuracy} label="Overall" color="#FFD700" />
                  {Object.entries(stats.byType)
                    .filter(([, v]) => v.total > 0)
                    .map(([type, v]) => (
                      <AccuracyRing
                        key={type}
                        percent={v.accuracy}
                        label={TYPE_CONFIG[type]?.label || type}
                        color={TYPE_CONFIG[type]?.color || '#FFD700'}
                      />
                    ))
                  }
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {!loading && predictions.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '3rem 1rem' }}
              >
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📭</div>
                <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>No predictions saved yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                  Go to Horoscope → Predictions tab and click "Save Prediction" to start tracking.
                </p>
                <GoldButton onClick={() => navigate('/horoscope')}>
                  View Horoscope Predictions →
                </GoldButton>
              </motion.div>
            )}

            {/* Filter tabs */}
            {predictions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {['all', 'pending', 'accurate', 'inaccurate'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: '999px',
                      border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
                      background: filter === f ? 'rgba(255,215,0,0.15)' : 'transparent',
                      color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                    }}
                  >
                    {f} {f === 'all' ? `(${predictions.length})` : `(${predictions.filter(p => p.status === f).length})`}
                  </button>
                ))}

                {/* Action buttons */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exportPredictions}
                    style={{
                      background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)',
                      borderRadius: '8px', padding: '0.4rem 0.8rem', color: 'var(--primary)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}
                  >
                    <Download size={13} /> Export
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClearAll}
                    style={{
                      background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                      borderRadius: '8px', padding: '0.4rem 0.8rem', color: '#f87171',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}
                  >
                    <Trash2 size={13} /> Clear All
                  </motion.button>
                </div>
              </div>
            )}

            {/* Prediction list */}
            <AnimatePresence>
              {filtered.map((pred) => (
                <PredictionCard
                  key={pred.id}
                  pred={pred}
                  onOutcome={handleOutcome}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>

          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
