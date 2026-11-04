/**
 * Admin.jsx — VedAstro Admin Control Panel
 *
 * Exclusively accessible to users with role === 'admin'.
 * Normal users are redirected to /home by AdminRoute in AppRouter.
 *
 * Features:
 *  • User management  — list / ban / unban / delete / promote to admin
 *  • Ban management   — view active bans, lift bans per device
 *  • System stats     — registered users, active bans, OTP records
 *  • Announcement     — broadcast a message shown to all users on login
 *  • API key health   — live ping of OpenRouter with current store key
 *  • Security log     — recent anomaly records from localStorage
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }  from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth }      from '../store/useAppStore';
import { signOutAdmin }  from '../db/adminDatabase';
import {
  listAllUsers,
  getUserByEmail,
} from '../db/userDatabase';

// ── Helpers ────────────────────────────────────────────────────────────────────

const DB_NAME    = 'vedastro_users';
const SEC_DB     = 'vedastro_security';

async function openDB(name, version = 1) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = ()  => reject(new Error(`IDB open failed: ${name}`));
  });
}

async function dbGetAll(dbName, storeName) {
  try {
    const db  = await openDB(dbName);
    if (!db.objectStoreNames.contains(storeName)) return [];
    return new Promise((resolve) => {
      const tx  = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror   = ()  => resolve([]);
    });
  } catch { return []; }
}

async function dbDelete(dbName, storeName, key) {
  try {
    const db = await openDB(dbName);
    if (!db.objectStoreNames.contains(storeName)) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    });
  } catch { return false; }
}

async function dbPut(dbName, storeName, key, value) {
  try {
    const db = await openDB(dbName);
    if (!db.objectStoreNames.contains(storeName)) return false;
    return new Promise((resolve) => {
      const tx    = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      key ? store.put(value, key) : store.put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    });
  } catch { return false; }
}

/** Update a user record in the users IDB store */
async function updateUser(email, patch) {
  try {
    const db = await openDB(DB_NAME);
    return new Promise((resolve, reject) => {
      const tx    = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req   = store.get(email.toLowerCase().trim());
      req.onsuccess = (e) => {
        const user = e.target.result;
        if (!user) return reject(new Error('User not found'));
        store.put({ ...user, ...patch });
        tx.oncomplete = () => resolve(true);
      };
      req.onerror = () => reject(new Error('DB error'));
    });
  } catch (err) { throw err; }
}

/** Issue a device ban into the security IDB (mimics banSystem.issueBan) */
function makeBanRecord(deviceId, reason = 'Admin action', durationMs = 30 * 60 * 1000) {
  const now  = Date.now();
  return {
    deviceId,
    reason,
    bannedAt:  new Date(now).toISOString(),
    expiresAt: new Date(now + durationMs).toISOString(),
    anomalyCount: 0,
  };
}

// ── Palette ────────────────────────────────────────────────────────────────────

const C = {
  bg:       '#070D0A',
  card:     'rgba(10,20,14,0.97)',
  border:   'rgba(255,42,95,0.22)',
  green:    '#00E575',
  red:      '#FF2A5F',
  gold:     '#FFD700',
  muted:    'rgba(255,255,255,0.35)',
  dimBg:    'rgba(255,255,255,0.03)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function Pill({ children, color = C.green }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
      background: `${color}18`, color, border: `1px solid ${color}40`,
    }}>
      {children}
    </span>
  );
}

function Stat({ label, value, icon, color = C.green }) {
  return (
    <div style={{
      flex: '1 1 140px', minWidth: 120,
      background: C.dimBg, borderRadius: '14px',
      border: `1.5px solid ${color}28`,
      padding: '1rem 1.2rem',
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
    }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ fontSize: '1.6rem', fontWeight: 800, color, fontFamily: 'Cinzel, serif' }}>
        {value ?? '—'}
      </span>
      <span style={{ fontSize: '0.68rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      marginBottom: '1rem', paddingBottom: '0.5rem',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 700, color: '#fff', letterSpacing: '0.07em' }}>
        {children}
      </span>
    </div>
  );
}

function ActionBtn({ children, onClick, danger, disabled, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: small ? '0.3rem 0.65rem' : '0.45rem 0.9rem',
      borderRadius: '8px', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      background: danger ? 'rgba(255,42,95,0.15)' : 'rgba(0,229,117,0.12)',
      color: danger ? C.red : C.green,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em',
      opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const color = type === 'error' ? C.red : type === 'warn' ? C.gold : C.green;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', top: '1.2rem', left: '50%', transform: 'translateX(-50%)',
        background: `${color}15`, border: `1px solid ${color}50`, borderRadius: '10px',
        padding: '0.65rem 1.2rem', color, fontSize: '0.82rem', fontWeight: 600,
        zIndex: 9999, backdropFilter: 'blur(12px)', maxWidth: '90vw', textAlign: 'center',
      }}>
      {type === 'error' ? '⚠️' : type === 'warn' ? '⚡' : '✅'} {msg}
    </motion.div>
  );
}

// ── Section: User Management ───────────────────────────────────────────────────

function UserTable({ users, onRefresh, showToast }) {
  const [busy, setBusy] = useState({});

  const run = async (email, label, fn) => {
    setBusy((b) => ({ ...b, [email + label]: true }));
    try {
      await fn();
      showToast(label + ' done', 'info');
      onRefresh();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy((b) => ({ ...b, [email + label]: false }));
    }
  };

  const toggleBan = (user) => {
    const isBanned = user.adminBanned;
    run(user.email, isBanned ? 'Unban' : 'Ban',
      () => updateUser(user.email, { adminBanned: !isBanned, adminBannedAt: isBanned ? null : new Date().toISOString() })
    );
  };

  const promote = (user) => {
    if (!window.confirm(`Promote ${user.email} to admin?`)) return;
    run(user.email, 'Promote', () => updateUser(user.email, { role: 'admin' }));
  };

  const demote = (user) => {
    if (!window.confirm(`Remove admin from ${user.email}?`)) return;
    run(user.email, 'Demote', () => updateUser(user.email, { role: 'user' }));
  };

  const deleteUser = (user) => {
    if (!window.confirm(`PERMANENTLY DELETE ${user.email}? This cannot be undone.`)) return;
    run(user.email, 'Delete', () => dbDelete(DB_NAME, 'users', user.email));
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr style={{ color: C.muted, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.07em' }}>
            {['Avatar', 'Email', 'Username', 'Role', 'Verified', 'Banned', 'Joined', 'Actions'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: `1px solid ${C.border}` }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: C.muted }}>No users found</td></tr>
          ) : (
            users.map((u) => (
              <tr key={u.email} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <td style={{ padding: '0.55rem 0.75rem' }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${C.red}44, ${C.green}33)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, color: '#fff',
                  }}>
                    {u.avatar || (u.username?.[0] || '?').toUpperCase()}
                  </div>
                </td>
                <td style={{ padding: '0.55rem 0.75rem', color: '#fff', maxWidth: 180,
                             overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </td>
                <td style={{ padding: '0.55rem 0.75rem', color: C.muted }}>{u.username}</td>
                <td style={{ padding: '0.55rem 0.75rem' }}>
                  <Pill color={u.role === 'admin' ? C.gold : C.green}>{u.role}</Pill>
                </td>
                <td style={{ padding: '0.55rem 0.75rem' }}>
                  <Pill color={u.verified ? C.green : C.muted}>{u.verified ? 'Yes' : 'No'}</Pill>
                </td>
                <td style={{ padding: '0.55rem 0.75rem' }}>
                  <Pill color={u.adminBanned ? C.red : C.muted}>{u.adminBanned ? 'Banned' : 'Active'}</Pill>
                </td>
                <td style={{ padding: '0.55rem 0.75rem', color: C.muted, fontSize: '0.7rem' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '0.55rem 0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    <ActionBtn small onClick={() => toggleBan(u)}
                      disabled={busy[u.email + (u.adminBanned ? 'Unban' : 'Ban')]}
                      danger={!u.adminBanned}>
                      {u.adminBanned ? '🔓 Unban' : '🔒 Ban'}
                    </ActionBtn>
                    {u.role !== 'admin'
                      ? <ActionBtn small onClick={() => promote(u)} disabled={busy[u.email + 'Promote']}>⬆ Admin</ActionBtn>
                      : <ActionBtn small onClick={() => demote(u)} disabled={busy[u.email + 'Demote']} danger>⬇ Demote</ActionBtn>
                    }
                    <ActionBtn small danger onClick={() => deleteUser(u)} disabled={busy[u.email + 'Delete']}>🗑 Delete</ActionBtn>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Ban Records ───────────────────────────────────────────────────────

function BanTable({ bans, onRefresh, showToast }) {
  const liftBan = async (key) => {
    await dbDelete(SEC_DB, 'ban_records', key);
    try { localStorage.removeItem('device_ban'); } catch {}
    showToast('Ban lifted', 'info');
    onRefresh();
  };

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const isExpired = (iso) => {
    try { return Date.now() > new Date(iso).getTime(); } catch { return false; }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      {bans.length === 0
        ? <p style={{ color: C.muted, textAlign: 'center', padding: '1.5rem' }}>No active ban records in IndexedDB.</p>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ color: C.muted, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.07em' }}>
                {['Device ID', 'Reason', 'Banned At', 'Expires At', 'Status', 'Action'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: `1px solid ${C.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bans.map((ban, i) => {
                const expired = isExpired(ban.expiresAt);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                    <td style={{ padding: '0.55rem 0.75rem', color: '#fff', fontFamily: 'monospace', fontSize: '0.68rem' }}>
                      {String(ban.deviceId || '').slice(0, 20)}…
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem', color: C.muted }}>{ban.reason || '—'}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: C.muted, fontSize: '0.72rem' }}>{fmtDate(ban.bannedAt)}</td>
                    <td style={{ padding: '0.55rem 0.75rem', color: C.muted, fontSize: '0.72rem' }}>{fmtDate(ban.expiresAt)}</td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <Pill color={expired ? C.muted : C.red}>{expired ? 'Expired' : 'Active'}</Pill>
                    </td>
                    <td style={{ padding: '0.55rem 0.75rem' }}>
                      <ActionBtn small onClick={() => liftBan('device_ban')}>🔓 Lift</ActionBtn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      }
    </div>
  );
}

// ── Section: Announcement ─────────────────────────────────────────────────────

function AnnouncementEditor({ showToast }) {
  const LS_KEY = 'vedastro_admin_announcement';
  const [text, setText] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || ''; } catch { return ''; }
  });
  const [type, setType] = useState('info'); // info | warn | danger

  const save = () => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(text));
      localStorage.setItem(LS_KEY + '_type', type);
      localStorage.setItem(LS_KEY + '_ts', new Date().toISOString());
      showToast('Announcement saved — users see it on next login', 'info');
    } catch (e) {
      showToast('Failed to save: ' + e.message, 'error');
    }
  };

  const clear = () => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_KEY + '_type');
    localStorage.removeItem(LS_KEY + '_ts');
    setText('');
    showToast('Announcement cleared', 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.6 }}>
        Broadcast a message shown in the Login page header to all users. Stored in localStorage on this device.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {['info', 'warn', 'danger'].map((t) => (
          <button key={t} onClick={() => setType(t)} style={{
            padding: '0.3rem 0.75rem', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700,
            background: type === t
              ? (t === 'info' ? C.green : t === 'warn' ? C.gold : C.red) + '28'
              : C.dimBg,
            color: type === t
              ? (t === 'info' ? C.green : t === 'warn' ? C.gold : C.red)
              : C.muted,
          }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        placeholder="e.g. 🔧 Scheduled maintenance on Nov 10 at 2 AM IST."
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical',
          background: C.dimBg, border: `1.5px solid ${C.border}`, borderRadius: '10px',
          color: '#fff', fontSize: '0.85rem', padding: '0.7rem 0.9rem',
          fontFamily: 'Inter, sans-serif', outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <ActionBtn onClick={save} disabled={!text.trim()}>💾 Save Announcement</ActionBtn>
        <ActionBtn onClick={clear} danger>🗑 Clear</ActionBtn>
      </div>
    </div>
  );
}

// ── Section: Security Log ─────────────────────────────────────────────────────

function SecurityLog() {
  const getRaw = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };

  const anomalies    = getRaw('sec_anomalies') || {};
  const cleanSession = getRaw('sec_clean_session_start');
  const lsBan        = getRaw('device_ban');

  const rows = [
    { key: 'device_ban',              label: 'Active localStorage Ban', value: lsBan ? JSON.stringify(lsBan, null, 2) : 'None' },
    { key: 'sec_anomalies',           label: 'Anomaly Records',         value: JSON.stringify(anomalies, null, 2) },
    { key: 'sec_clean_session_start', label: 'Clean Session Start',     value: cleanSession ? new Date(cleanSession).toLocaleString() : 'None' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {rows.map((r) => (
        <div key={r.key} style={{
          background: C.dimBg, borderRadius: '10px', padding: '0.75rem 0.9rem',
          border: `1px solid rgba(255,255,255,0.05)`,
        }}>
          <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase',
                        letterSpacing: '0.07em', marginBottom: '0.35rem' }}>
            {r.label}
          </div>
          <pre style={{ margin: 0, fontSize: '0.72rem', color: '#ccc',
                        overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {r.value}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ── Section: API Health ───────────────────────────────────────────────────────

function ApiHealth({ orKey }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${orKey}` },
      });
      if (!res.ok) { setResult({ ok: false, msg: `HTTP ${res.status}` }); return; }
      const data = await res.json();
      setResult({ ok: true, msg: `Connected — ${data?.data?.length || 0} models available` });
    } catch (e) {
      setResult({ ok: false, msg: e.message });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.6 }}>
        Live ping to OpenRouter using the API key stored in the Zustand store.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1, background: C.dimBg, border: `1.5px solid ${C.border}`,
          borderRadius: '10px', padding: '0.6rem 0.9rem',
          fontFamily: 'monospace', fontSize: '0.75rem', color: C.muted,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {orKey ? `${orKey.slice(0, 12)}${'•'.repeat(16)}${orKey.slice(-6)}` : 'No API key set'}
        </div>
        <ActionBtn onClick={test} disabled={!orKey || busy}>
          {busy ? '⏳ Testing…' : '⚡ Test Connection'}
        </ActionBtn>
      </div>
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{
              padding: '0.6rem 0.9rem', borderRadius: '10px',
              background: result.ok ? 'rgba(0,229,117,0.08)' : 'rgba(255,42,95,0.08)',
              border: `1px solid ${result.ok ? C.green : C.red}40`,
              color: result.ok ? C.green : C.red, fontSize: '0.8rem', fontWeight: 600,
            }}>
            {result.ok ? '✅' : '⚠️'} {result.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section: Danger Zone ──────────────────────────────────────────────────────

function DangerZone({ showToast, onRefresh }) {
  const [confirmText, setConfirmText] = useState('');
  const CONFIRM_WORD = 'DELETE ALL';

  const nukeAllBans = async () => {
    await dbDelete(SEC_DB, 'ban_records', 'device_ban');
    try { localStorage.removeItem('device_ban'); localStorage.removeItem('sec_anomalies'); } catch {}
    showToast('All ban data cleared', 'warn');
    onRefresh();
  };

  const nukeOTPs = async () => {
    const db = await openDB(DB_NAME);
    if (!db.objectStoreNames.contains('otps')) { showToast('No OTP store found', 'warn'); return; }
    const tx = db.transaction('otps', 'readwrite');
    tx.objectStore('otps').clear();
    tx.oncomplete = () => { showToast('All OTPs cleared', 'warn'); onRefresh(); };
  };

  const nukeAllUsers = async () => {
    if (confirmText.trim() !== CONFIRM_WORD) {
      showToast(`Type exactly "${CONFIRM_WORD}" to confirm`, 'error'); return;
    }
    const db = await openDB(DB_NAME);
    const tx = db.transaction('users', 'readwrite');
    tx.objectStore('users').clear();
    tx.oncomplete = () => { showToast('⚠️ All users deleted', 'warn'); setConfirmText(''); onRefresh(); };
  };

  return (
    <div style={{
      border: `1.5px solid rgba(255,42,95,0.35)`, borderRadius: '14px',
      padding: '1.2rem', background: 'rgba(255,42,95,0.03)',
    }}>
      <div style={{ marginBottom: '1rem', fontSize: '0.78rem', color: 'rgba(255,100,100,0.7)', lineHeight: 1.6 }}>
        ⚠️ These actions are irreversible. Use with extreme caution.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.2rem' }}>
        <ActionBtn danger onClick={nukeAllBans}>💣 Clear All Ban Records</ActionBtn>
        <ActionBtn danger onClick={nukeOTPs}>🗑 Purge All OTPs</ActionBtn>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type "${CONFIRM_WORD}" to delete ALL users`}
          style={{
            flex: 1, minWidth: 200, background: C.dimBg, border: `1.5px solid rgba(255,42,95,0.3)`,
            borderRadius: '10px', padding: '0.6rem 0.9rem', color: '#fff', fontSize: '0.82rem', outline: 'none',
          }}
        />
        <ActionBtn danger onClick={nukeAllUsers}>💥 Delete ALL Users</ActionBtn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: 'overview',      icon: '📊', label: 'Overview'      },
  { id: 'users',        icon: '👥', label: 'Users'          },
  { id: 'bans',         icon: '🔒', label: 'Ban Records'    },
  { id: 'announce',     icon: '📢', label: 'Announcement'   },
  { id: 'api',          icon: '⚡', label: 'API Health'     },
  { id: 'security_log', icon: '🛡️', label: 'Security Log'   },
  { id: 'danger',       icon: '☠️', label: 'Danger Zone'    },
];

export default function Admin() {
  const { currentUser, credentials } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('overview');
  const [users,   setUsers]   = useState([]);
  const [bans,    setBans]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState({ msg: '', type: 'info' });
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ msg: '', type: 'info' }), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([
        listAllUsers(),
        dbGetAll(SEC_DB, 'ban_records'),
      ]);
      setUsers(u);
      setBans(b);
    } catch (e) {
      showToast('Failed to load data: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Stats
  const totalUsers  = users.length;
  const adminCount  = users.filter((u) => u.role === 'admin').length;
  const bannedCount = users.filter((u) => u.adminBanned).length;
  const activeBans  = bans.filter((b) => Date.now() < new Date(b.expiresAt).getTime()).length;

  const sectionContent = () => {
    switch (section) {
      case 'overview':
        return (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <Stat icon="👥" label="Total Users"    value={totalUsers}  color={C.green} />
              <Stat icon="👑" label="Admins"         value={adminCount}  color={C.gold}  />
              <Stat icon="🔒" label="User-Banned"    value={bannedCount} color={C.red}   />
              <Stat icon="☠️" label="Device Bans"    value={activeBans}  color={C.red}   />
            </div>
            <div style={{ background: C.dimBg, borderRadius: '12px', padding: '1rem', border: `1px solid ${C.border}` }}>
              <p style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.8, margin: 0 }}>
                👋 Logged in as <strong style={{ color: C.green }}>{currentUser?.username}</strong>
                {' '}(<Pill color={C.gold}>admin</Pill>)<br />
                Use the left sidebar to navigate sections. All changes take effect immediately in IndexedDB.
              </p>
            </div>
          </div>
        );
      case 'users':
        return <UserTable users={users} onRefresh={loadData} showToast={showToast} />;
      case 'bans':
        return <BanTable bans={bans} onRefresh={loadData} showToast={showToast} />;
      case 'announce':
        return <AnnouncementEditor showToast={showToast} />;
      case 'api':
        return <ApiHealth orKey={credentials?.openRouterKey} />;
      case 'security_log':
        return <SecurityLog />;
      case 'danger':
        return <DangerZone showToast={showToast} onRefresh={loadData} />;
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 15% 20%, rgba(255,42,95,0.08) 0%, transparent 50%),
                   radial-gradient(ellipse at 85% 80%, rgba(0,229,117,0.06) 0%, transparent 50%),
                   ${C.bg}`,
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
    }}>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>{toast.msg && <Toast msg={toast.msg} type={toast.type} />}</AnimatePresence>

      {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: 'rgba(7,13,10,0.98)',
        borderRight: `1.5px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {/* Brand */}
        <div style={{ padding: '1.5rem 1.2rem 1rem', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', fontWeight: 700, color: C.red }}>
            🛡️ Admin Panel
          </div>
          <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.2rem', letterSpacing: '0.06em' }}>
            VEDASTRO CONTROL
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              padding: '0.55rem 0.75rem', borderRadius: '9px', border: 'none',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              background: section === s.id ? 'rgba(255,42,95,0.14)' : 'transparent',
              color: section === s.id ? '#fff' : C.muted,
              fontWeight: section === s.id ? 600 : 400, fontSize: '0.85rem',
              transition: 'all 0.15s',
              outline: section === s.id ? `1px solid rgba(255,42,95,0.3)` : 'none',
            }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {s.id === 'users' && totalUsers > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'rgba(255,215,0,0.15)', color: C.gold,
                  fontSize: '0.6rem', fontWeight: 700, borderRadius: '10px', padding: '1px 6px',
                }}>{totalUsers}</span>
              )}
              {s.id === 'bans' && activeBans > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'rgba(255,42,95,0.2)', color: C.red,
                  fontSize: '0.6rem', fontWeight: 700, borderRadius: '10px', padding: '1px 6px',
                }}>{activeBans}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Back to app + Sign Out */}
        <div style={{ padding: '0.75rem', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <button onClick={() => navigate('/home')} style={{
            width: '100%', padding: '0.55rem', borderRadius: '9px',
            border: `1px solid rgba(0,229,117,0.2)`, background: 'rgba(0,229,117,0.05)',
            color: C.green, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          }}>
            ← Back to App
          </button>
          <button onClick={async () => { await signOutAdmin(); navigate('/admin-login', { replace: true }); }} style={{
            width: '100%', padding: '0.55rem', borderRadius: '9px',
            border: `1px solid rgba(255,42,95,0.25)`, background: 'rgba(255,42,95,0.06)',
            color: C.red, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
          }}>
            🚪 Sign Out Admin
          </button>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxWidth: 'calc(100vw - 220px)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      marginBottom: '1.8rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: 'Cinzel, serif', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
              {SECTIONS.find((s) => s.id === section)?.icon}{' '}
              {SECTIONS.find((s) => s.id === section)?.label}
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: C.muted, letterSpacing: '0.06em' }}>
              VEDASTRO ADMIN — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button onClick={loadData} disabled={loading} style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.1)`,
            color: C.muted, padding: '0.45rem 0.9rem', borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.78rem',
          }}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {/* Content card */}
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: C.card, border: `1.5px solid ${C.border}`,
            borderRadius: '18px', padding: '1.5rem',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <SectionTitle icon={SECTIONS.find((s) => s.id === section)?.icon}>
            {SECTIONS.find((s) => s.id === section)?.label}
          </SectionTitle>

          {loading
            ? <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>⏳ Loading…</div>
            : sectionContent()
          }
        </motion.div>
      </main>
    </div>
  );
}

