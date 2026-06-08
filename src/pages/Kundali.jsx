import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { getChartImage } from '../api/astrologyApi';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import GoldButton from '../components/ui/GoldButton';
import LoadingWheel from '../components/ui/LoadingWheel';

const CHART_TYPES = [
  { id: 'D1', label: 'Lagna (D1)' },
  { id: 'D9', label: 'Navamsa (D9)' },
  { id: 'SUN', label: 'Sun Chart' },
  { id: 'MOON', label: 'Moon Chart' },
  { id: 'D2', label: 'Hora (D2)' },
  { id: 'D3', label: 'Drekkana (D3)' },
  { id: 'D4', label: 'Chaturthamsha (D4)' },
  { id: 'D10', label: 'Dasamsa (D10)' }
];

export default function Kundali() {
  const { t } = useLanguage();
  const { credentials } = useAuth();
  const navigate = useNavigate();
  const birthData = storage.getBirthData();

  const [activeChart, setActiveChart] = useState('D1');
  const [chartStyle, setChartStyle] = useState('NORTH_INDIAN');
  const [svgData, setSvgData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!birthData) return;
    fetchChart(activeChart, chartStyle);
  }, [activeChart, chartStyle]);

  const fetchChart = async (chartId, style) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getChartImage(chartId, style, birthData, credentials);
      if (res && res.svg) {
        setSvgData(res.svg);
      } else {
        setError('Failed to load chart image.');
      }
    } catch (err) {
      console.error('[Kundali] fetch error:', err);
      setError('Could not load chart. Please check connection and credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!birthData) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <Navbar />
        <div className="page-with-sidebar">
          <Sidebar />
          <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', maxWidth: '360px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📜</div>
              <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>No Birth Chart Found</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Enter your birth details to generate your Kundali charts.
              </p>
              <GoldButton onClick={() => navigate('/birth-chart')}>Set Up Birth Chart</GoldButton>
            </div>
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

 return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                  📜 {t('kundali') || 'Kundali Viewer'}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {birthData.name}'s Divisional Charts
                </p>
              </div>

              {/* Chart Style Toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.25rem' }}>
                {['NORTH_INDIAN', 'SOUTH_INDIAN'].map((style) => (
                  <button
                    key={style}
                    onClick={() => setChartStyle(style)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: chartStyle === style ? 'var(--primary)' : 'transparent',
                      color: chartStyle === style ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {style.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Type Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
              {CHART_TYPES.map((chart) => (
                <button
                  key={chart.id}
                  onClick={() => setActiveChart(chart.id)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '999px',
                    border: `1px solid ${activeChart === chart.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: activeChart === chart.id ? 'rgba(255,215,0,0.15)' : 'transparent',
                    color: activeChart === chart.id ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {chart.label}
                </button>
              ))}
            </div>

            {/* Chart Viewer Area */}
            <div className="glass-card" style={{ padding: '2rem', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {loading ? (
                <LoadingWheel size={60} />
              ) : error ? (
                <div style={{ color: '#f87171', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                  {error}
                </div>
              ) : svgData ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ width: '100%', maxWidth: '500px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '1rem' }}
                  dangerouslySetInnerHTML={{ __html: svgData }}
                />
              ) : null}
            </div>
          </motion.div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
