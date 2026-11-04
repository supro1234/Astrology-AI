import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth }     from '../../store/useAppStore';

const NAV_ITEMS = [
  { path: '/home',        icon: '🪐', key: 'home'        },
  { path: '/birth-chart', icon: '👤', key: 'birth_chart' },
  { path: '/horoscope',   icon: '✨', key: 'horoscope'   },
  { path: '/panchang',    icon: '📅', key: 'panchang'    },
  { path: '/kundali',     icon: '📜', key: 'kundali'     },
  { path: '/numerology',  icon: '🔢', key: 'numerology'  },
  { path: '/match',       icon: '💑', key: 'match'       },
  { path: '/chat',        icon: '🔮', key: 'chat'        },
  { path: '/todo',        icon: '✅', key: 'todo', label: 'Todo List' },
  { path: '/settings',    icon: '⚙️', key: 'settings'   },
];

export default function Sidebar() {
  const { t }                        = useLanguage();
  const { currentUser, logout }      = useAuth();
  const navigate                     = useNavigate();
  const isAdmin                      = currentUser?.role === 'admin';

  const navItemStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.6rem 0.85rem', borderRadius: '10px', cursor: 'pointer',
    background: isActive ? 'rgba(255,42,95,0.12)' : 'transparent',
    border:     isActive ? '1px solid rgba(255,42,95,0.35)' : '1px solid transparent',
    color:      isActive ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.9rem',
    boxShadow: isActive ? '0 0 12px rgba(255,42,95,0.15)' : 'none',
    transition: 'all 0.2s ease',
  });

  return (
    <aside className="sidebar">
      {/* App branding */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          fontFamily: 'Cinzel, serif', fontSize: '1.2rem', fontWeight: 700,
          color: 'var(--primary)', textShadow: '0 0 10px rgba(255,215,0,0.3)',
        }}>
          🪐 VedAstro
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          Ancient Wisdom. Digital Precision.
        </div>
        {/* Logged-in user badge */}
        {currentUser && (
          <div style={{
            marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
            padding: '0.4rem 0.65rem', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: '1rem' }}>
              {isAdmin ? '👑' : '🔮'}
            </span>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: isAdmin ? '#FFD700' : 'var(--text)', lineHeight: 1.2 }}>
                {currentUser.username || currentUser.name}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                {isAdmin ? 'Administrator' : 'Member'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {NAV_ITEMS.map((item, i) => (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 4 }}
                style={navItemStyle(isActive)}
              >
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <span>{item.label || t(item.key)}</span>
              </motion.div>
            )}
          </NavLink>
        ))}

        {/* ── Admin link — ONLY visible to admins ───────────────────────── */}
        {isAdmin && (
          <>
            <div style={{
              margin: '0.6rem 0.25rem 0.2rem',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.25), transparent)',
            }} />
            <NavLink to="/admin" style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: NAV_ITEMS.length * 0.04 }}
                  whileHover={{ x: 4 }}
                  style={{
                    ...navItemStyle(isActive),
                    background: isActive
                      ? 'rgba(255,215,0,0.12)'
                      : 'rgba(255,215,0,0.04)',
                    border: isActive
                      ? '1px solid rgba(255,215,0,0.4)'
                      : '1px solid rgba(255,215,0,0.12)',
                    color: '#FFD700',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>🛡️</span>
                  <span style={{ fontWeight: 600 }}>Admin Panel</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.55rem', fontWeight: 800,
                    background: 'rgba(255,215,0,0.2)', borderRadius: '4px',
                    padding: '1px 5px', letterSpacing: '0.06em',
                  }}>
                    ADMIN
                  </span>
                </motion.div>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout button */}
      {currentUser && (
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            style={{
              width: '100%', padding: '0.5rem', borderRadius: '9px',
              border: '1px solid rgba(255,42,95,0.2)',
              background: 'rgba(255,42,95,0.05)',
              color: 'rgba(255,100,100,0.7)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              textAlign: 'center',
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      )}

      {/* Version */}
      <div style={{
        padding: '0.75rem', textAlign: 'center',
        fontSize: '0.7rem', color: 'var(--text-muted)',
        borderTop: '1px solid var(--border)',
      }}>
        VedAstro v2.0.5
      </div>
    </aside>
  );
}
