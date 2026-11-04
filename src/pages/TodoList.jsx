import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import { storage } from '../utils/storage';
import { useAuth } from '../store/useAppStore';

const TODO_KEY = 'vedastro_todos';

function loadTodos() {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTodos(todos) {
  try { localStorage.setItem(TODO_KEY, JSON.stringify(todos)); } catch {}
}

function genId() {
  return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Single Todo Item ─────────────────────────────────────────────────────────
function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitEdit = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== todo.text) onEdit(todo.id, trimmed);
    setEditing(false);
  };

  const priorityColors = {
    high:   { bg: 'rgba(255,42,95,0.12)',   border: 'rgba(255,42,95,0.4)',   dot: '#FF2A5F' },
    medium: { bg: 'rgba(255,180,0,0.10)',    border: 'rgba(255,180,0,0.35)',  dot: '#FFB400' },
    low:    { bg: 'rgba(0,229,117,0.10)',    border: 'rgba(0,229,117,0.35)', dot: '#00E575' },
  };
  const pc = priorityColors[todo.priority] || priorityColors.medium;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, scale: 0.9 }}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        background: todo.done
          ? 'rgba(255,255,255,0.02)'
          : `linear-gradient(135deg, ${pc.bg}, rgba(8,13,10,0.95))`,
        border: `1.5px solid ${todo.done ? 'rgba(255,255,255,0.06)' : pc.border}`,
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        cursor: 'grab',
        boxShadow: todo.done
          ? 'none'
          : `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 ${pc.border}`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Priority dot */}
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: todo.done ? 'rgba(255,255,255,0.15)' : pc.dot,
        boxShadow: todo.done ? 'none' : `0 0 8px ${pc.dot}`,
        flexShrink: 0,
        marginTop: '0.4rem',
        transition: 'all 0.3s',
      }} />

      {/* Checkbox */}
      <motion.button
        onClick={() => onToggle(todo.id)}
        whileTap={{ scale: 0.85 }}
        style={{
          width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
          border: todo.done ? '2px solid #00E575' : '2px solid rgba(255,42,95,0.4)',
          background: todo.done ? 'rgba(0,229,117,0.2)' : 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: todo.done ? '0 0 8px rgba(0,229,117,0.4)' : 'none',
        }}
      >
        <AnimatePresence>
          {todo.done && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{ fontSize: '0.7rem', color: '#00E575' }}
            >✓</motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(0,229,117,0.4)', borderRadius: '8px',
              padding: '0.3rem 0.6rem', color: '#fff', fontSize: '0.9rem', outline: 'none',
            }}
          />
        ) : (
          <div
            onDoubleClick={() => setEditing(true)}
            title="Double-click to edit"
            style={{
              color: todo.done ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.88)',
              fontSize: '0.9rem', textDecoration: todo.done ? 'line-through' : 'none',
              wordBreak: 'break-word', lineHeight: 1.5,
              transition: 'color 0.3s',
            }}
          >
            {todo.text}
          </div>
        )}
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.2rem' }}>
          {new Date(todo.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <motion.button
          onClick={() => setEditing(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Edit"
          style={{
            background: 'rgba(0,229,117,0.1)', border: '1px solid rgba(0,229,117,0.2)',
            borderRadius: '8px', padding: '0.3rem 0.5rem', color: '#00E575',
            cursor: 'pointer', fontSize: '0.75rem',
          }}
        >✏️</motion.button>
        <motion.button
          onClick={() => onDelete(todo.id)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title="Delete"
          style={{
            background: 'rgba(255,42,95,0.1)', border: '1px solid rgba(255,42,95,0.2)',
            borderRadius: '8px', padding: '0.3rem 0.5rem', color: '#FF2A5F',
            cursor: 'pointer', fontSize: '0.75rem',
          }}
        >🗑️</motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main TodoList Page ───────────────────────────────────────────────────────
export default function TodoList() {
  const navigate = useNavigate();
  const { credentials } = useAuth();

  const [todos, setTodos] = useState(loadTodos);
  const [newText, setNewText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'done'
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  // Live-persist on every change
  useEffect(() => { saveTodos(todos); }, [todos]);

  const addTodo = (e) => {
    e?.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;
    setTodos((prev) => [{
      id: genId(),
      text: trimmed,
      done: false,
      priority,
      createdAt: Date.now(),
    }, ...prev]);
    setNewText('');
  };

  const toggleTodo = (id) =>
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));

  const deleteTodo = (id) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));

  const editTodo = (id, text) =>
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, text } : t));

  const clearDone = () =>
    setTodos((prev) => prev.filter((t) => !t.done));

  // AI Suggestion via OpenRouter /responses
  const getAISuggestion = async () => {
    const key = credentials?.openRouterKey || import.meta.env?.VITE_OPENROUTER_API_KEY;
    if (!key) {
      setAiSuggestion('⚠️ Add VITE_OPENROUTER_API_KEY in your .env file to enable AI suggestions.');
      return;
    }
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const activeTodos = todos.filter((t) => !t.done).map((t) => t.text).join(', ') || 'no tasks yet';
      const res = await fetch('https://openrouter.ai/api/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-OpenRouter-Title': 'VedAstro Todo',
        },
        body: JSON.stringify({
          model: import.meta.env?.VITE_OPENROUTER_MODEL || '~openai/gpt-sol-latest',
          input: `I'm a Vedic astrology enthusiast. My current tasks: ${activeTodos}. Suggest 3 concise cosmic/mindful productivity tasks I should add. Format as a short list. Keep it brief.`,
        }),
      });
      const data = await res.json();
      const text = data?.output?.[0]?.content?.[0]?.text
        || data?.choices?.[0]?.message?.content
        || data?.output || 'No suggestion returned.';
      setAiSuggestion(typeof text === 'string' ? text : JSON.stringify(text));
    } catch (err) {
      setAiSuggestion(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = todos.filter((t) =>
    filter === 'all' ? true : filter === 'active' ? !t.done : t.done
  );

  const doneCount   = todos.filter((t) => t.done).length;
  const activeCount = todos.filter((t) => !t.done).length;
  const progress    = todos.length ? Math.round((doneCount / todos.length) * 100) : 0;

  const priorityOptions = [
    { value: 'high',   label: '🔴 High',   color: '#FF2A5F' },
    { value: 'medium', label: '🟡 Medium', color: '#FFB400' },
    { value: 'low',    label: '🟢 Low',    color: '#00E575' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #080D0A)' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main className="main-content" style={{ position: 'relative', maxWidth: '780px' }}>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '1.75rem' }}
          >
            <h1 style={{
              fontFamily: 'Cinzel, serif',
              fontSize: 'clamp(1.4rem, 4vw, 2rem)',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF2A5F, #FF6B9D, #00E575)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.25rem',
            }}>
              ✅ Cosmic Todo List
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              Live · {activeCount} active · {doneCount} completed
            </p>
          </motion.div>

          {/* Progress Bar */}
          {todos.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginBottom: '1.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Progress
                </span>
                <span style={{ fontSize: '0.72rem', color: '#00E575', fontWeight: 700 }}>
                  {progress}%
                </span>
              </div>
              <div style={{
                height: '6px', background: 'rgba(255,255,255,0.06)',
                borderRadius: '99px', overflow: 'hidden',
                border: '1px solid rgba(255,42,95,0.1)',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #FF2A5F, #00E575)',
                    borderRadius: '99px',
                    boxShadow: '0 0 8px rgba(0,229,117,0.5)',
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Add Todo */}
          <motion.form
            onSubmit={addTodo}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              background: 'linear-gradient(135deg, rgba(15,25,18,0.9), rgba(8,13,10,0.95))',
              border: '1.5px solid rgba(255,42,95,0.25)',
              borderRadius: '18px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Add a cosmic task…"
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1.5px solid rgba(0,229,117,0.2)',
                  borderRadius: '12px', padding: '0.75rem 1rem',
                  color: '#fff', fontSize: '0.9rem', outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: 'linear-gradient(180deg, #FF4F7B, #FF2A5F, #CC1040)',
                  border: 'none', borderRadius: '12px',
                  padding: '0 1.25rem', color: '#fff',
                  fontSize: '1.2rem', cursor: 'pointer',
                  boxShadow: '0 3px 0 #8B0020, 0 4px 12px rgba(255,42,95,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
              >
                +
              </motion.button>
            </div>

            {/* Priority selector */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {priorityOptions.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '99px',
                    border: `1px solid ${priority === p.value ? p.color : 'rgba(255,255,255,0.1)'}`,
                    background: priority === p.value ? `${p.color}20` : 'transparent',
                    color: priority === p.value ? p.color : 'rgba(255,255,255,0.4)',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </motion.form>

          {/* Filter + Clear */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'active', 'done'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '0.3rem 0.8rem',
                    borderRadius: '99px',
                    border: `1px solid ${filter === f ? 'rgba(255,42,95,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    background: filter === f ? 'rgba(255,42,95,0.15)' : 'transparent',
                    color: filter === f ? '#FF6B9D' : 'rgba(255,255,255,0.35)',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    textTransform: 'capitalize', transition: 'all 0.2s',
                  }}
                >
                  {f} {f === 'all' ? todos.length : f === 'active' ? activeCount : doneCount}
                </button>
              ))}
            </div>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,42,95,0.2)',
                  borderRadius: '8px', padding: '0.3rem 0.75rem',
                  color: 'rgba(255,42,95,0.6)', fontSize: '0.72rem', cursor: 'pointer',
                }}
              >
                🗑️ Clear done
              </button>
            )}
          </div>

          {/* Todo List */}
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  textAlign: 'center', padding: '3rem 1rem',
                  color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem',
                }}
              >
                {filter === 'done' ? '🎉 No completed tasks yet!' : '✨ The cosmos awaits your first task!'}
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <AnimatePresence>
                  {filtered.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={toggleTodo}
                      onDelete={deleteTodo}
                      onEdit={editTodo}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>

          {/* AI Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{
              marginTop: '2rem',
              background: 'linear-gradient(135deg, rgba(0,229,117,0.06), rgba(8,13,10,0.95))',
              border: '1.5px solid rgba(0,229,117,0.2)',
              borderRadius: '18px',
              padding: '1.25rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(0,229,117,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiSuggestion ? '1rem' : 0, flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#00E575', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  🤖 AI Cosmic Suggestions
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                  Powered by OpenRouter • GPT-Sol
                </div>
              </div>
              <motion.button
                onClick={getAISuggestion}
                disabled={aiLoading}
                whileHover={{ scale: aiLoading ? 1 : 1.03 }}
                whileTap={{ scale: aiLoading ? 1 : 0.97 }}
                style={{
                  background: aiLoading ? 'rgba(0,229,117,0.1)' : 'linear-gradient(180deg, rgba(0,229,117,0.3), rgba(0,178,90,0.4))',
                  border: '1px solid rgba(0,229,117,0.4)', borderRadius: '10px',
                  padding: '0.5rem 1rem', color: '#00E575',
                  fontSize: '0.8rem', fontWeight: 600, cursor: aiLoading ? 'not-allowed' : 'pointer',
                  boxShadow: aiLoading ? 'none' : '0 2px 0 rgba(0,100,50,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
                  transition: 'all 0.2s',
                }}
              >
                {aiLoading ? '⏳ Thinking…' : '✨ Suggest Tasks'}
              </motion.button>
            </div>

            <AnimatePresence>
              {aiSuggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(0,229,117,0.06)',
                    border: '1px solid rgba(0,229,117,0.15)',
                    borderRadius: '10px', padding: '0.875rem',
                    color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  }}
                >
                  {aiSuggestion}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </main>
      </div>
      <BottomNav />
    </div>
  );
}

