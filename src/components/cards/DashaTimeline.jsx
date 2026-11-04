import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDashaDate, getCountdownText } from '../../utils/dashaCalculator';

/**
 * DashaTimeline — Visual horizontal timeline of Vimshottari Dasha periods
 */
export default function DashaTimeline({ timeline }) {
  const [expanded, setExpanded] = useState(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Add your birth data to see your dasha timeline
      </div>
    );
  }

  const activeDasha = timeline.find(d => d.isActive);
  const nextDasha   = timeline.find(d => d.isFuture);

  return (
    <div>
      {/* ── Active Dasha Banner ─────────────────────────────────── */}
      {activeDasha && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.25rem',
            borderLeft: `4px solid ${activeDasha.color}`,
            background: `linear-gradient(135deg, ${activeDasha.color}12, transparent)`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                Active Mahadasha
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: activeDasha.color, fontFamily: 'Cinzel, serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {activeDasha.emoji} {activeDasha.planet}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {formatDashaDate(activeDasha.startDate)} → {formatDashaDate(activeDasha.endDate)}
                &nbsp;·&nbsp;{activeDasha.durationYears}yr period
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Nature</div>
              <span style={{
                background: activeDasha.nature === 'benefic'
                  ? 'rgba(74,222,128,0.15)' : activeDasha.nature === 'malefic'
                  ? 'rgba(248,113,113,0.15)' : 'rgba(255,215,0,0.15)',
                color: activeDasha.nature === 'benefic' ? '#4ade80' : activeDasha.nature === 'malefic' ? '#f87171' : '#FFD700',
                borderRadius: '999px',
                padding: '0.2rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'capitalize',
              }}>
                {activeDasha.nature}
              </span>
            </div>
          </div>

          {/* Opportunity text */}
          <p style={{ color: 'var(--text)', fontSize: '0.83rem', lineHeight: 1.65, marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
            {activeDasha.opportunity}
          </p>
        </motion.div>
      )}

      {/* ── Next Transition Alert ────────────────────────────────── */}
      {nextDasha && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: 'rgba(255,215,0,0.06)',
            border: '1px solid rgba(255,215,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⏰</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
              {nextDasha.emoji} {nextDasha.planet} Mahadasha
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {' '}starts in {getCountdownText(nextDasha.startDate)}
            </span>
          </div>
          <span style={{
            background: `${nextDasha.color}20`,
            color: nextDasha.color,
            fontSize: '0.72rem',
            fontWeight: 700,
            borderRadius: '999px',
            padding: '0.2rem 0.6rem',
            textTransform: 'capitalize',
          }}>
            {nextDasha.nature}
          </span>
        </motion.div>
      )}

      {/* ── Horizontal Timeline Bar ──────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>
          Dasha Timeline
        </div>
        <div style={{ display: 'flex', height: '10px', borderRadius: '999px', overflow: 'hidden', gap: '2px' }}>
          {timeline.map((d, i) => {
            const totalYears = timeline.reduce((s, t) => s + t.durationYears, 0) || 1;
            const width = (d.durationYears / totalYears) * 100;
            return (
              <motion.div
                key={i}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                style={{
                  width: `${width}%`,
                  background: d.color,
                  opacity: d.isPast ? 0.3 : d.isActive ? 1 : 0.65,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  outline: d.isActive ? `2px solid ${d.color}` : 'none',
                  outlineOffset: '1px',
                  transition: 'opacity 0.2s',
                  flexShrink: 0,
                }}
                onClick={() => setExpanded(expanded === i ? null : i)}
                title={`${d.planet} (${d.durationYears}yr)`}
              />
            );
          })}
        </div>
      </div>

      {/* ── Period Cards ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
        {timeline.map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              minWidth: '100px',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: d.isActive
                ? `linear-gradient(135deg, ${d.color}22, ${d.color}08)`
                : 'var(--surface)',
              border: `1px solid ${d.isActive ? d.color : 'var(--border)'}`,
              cursor: 'pointer',
              textAlign: 'center',
              flexShrink: 0,
              opacity: d.isPast ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{d.emoji}</div>
            <div style={{ fontWeight: 700, color: d.color, fontSize: '0.85rem' }}>{d.planet}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {formatDashaDate(d.startDate)}
            </div>
            {d.isActive && (
              <div style={{ marginTop: '0.35rem' }}>
                <span style={{ fontSize: '0.6rem', color: '#4ade80', fontWeight: 700 }}>● NOW</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Expanded Detail Panel ─────────────────────────────────── */}
      <AnimatePresence>
        {expanded !== null && timeline[expanded] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: '1rem' }}
          >
            <div className="glass-card" style={{
              padding: '1.25rem',
              borderLeft: `4px solid ${timeline[expanded].color}`,
            }}>
              <div style={{ fontWeight: 700, color: timeline[expanded].color, fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {timeline[expanded].emoji} {timeline[expanded].planet} Mahadasha
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                {formatDashaDate(timeline[expanded].startDate)} → {formatDashaDate(timeline[expanded].endDate)}
                &nbsp;·&nbsp;{timeline[expanded].durationYears} years
              </div>
              <p style={{ color: 'var(--text)', fontSize: '0.84rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                {timeline[expanded].opportunity}
              </p>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.78rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  ✨ Remedies
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {(timeline[expanded].remedies || []).map((r, ri) => (
                    <li key={ri} style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5 }}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
