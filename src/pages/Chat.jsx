import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, AlertCircle, UserCircle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { getAiChat } from '../api/astrologyApi';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import ChatBubble from '../components/chat/ChatBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import QuickChips from '../components/chat/QuickChips';

function formatTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const WELCOME_MSG = {
  id: 0,
  isUser: false,
  text: '🔮 Namaste! I am VedaGuru, your Vedic Astrological Guide. I can reveal insights about your birth chart, planetary positions, dasha periods, and life predictions. What would you like to know?',
  time: formatTime(),
};

function ErrorBanner({ icon, title, detail, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        margin: '1rem 1.5rem',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.25)',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
      }}
    >
      <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f87171', marginBottom: '0.2rem' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{detail}</div>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: 'rgba(248,113,113,0.15)',
            border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            color: '#f87171',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

export default function Chat() {
  const { t } = useLanguage();
  const { credentials } = useAuth();
  const navigate = useNavigate();
  const birthData = storage.getBirthData();

  const hasApiKey = !!(credentials?.apiKey);
  const hasBirthData = !!(birthData?.day && birthData?.lat);

  const [messages, setMessages] = useState(() => {
    const saved = storage.getChatHistory();
    return saved.length > 0 ? saved : [WELCOME_MSG];
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    storage.setChatHistory(messages);
  }, [messages]);

  const addAiMessage = (text) => {
    const aiMsg = { id: Date.now() + 1, isUser: false, text, time: formatTime() };
    setMessages((m) => [...m, aiMsg]);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Guard: no API key
    if (!hasApiKey) {
      const userMsg = { id: Date.now(), isUser: true, text: text.trim(), time: formatTime() };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      addAiMessage('⚠️ Please verify your API key in Settings before using the chat. Navigate to Settings → re-enter your Access Token → Verify & Save.');
      return;
    }

    // Guard: no birth data
    if (!hasBirthData) {
      const userMsg = { id: Date.now(), isUser: true, text: text.trim(), time: formatTime() };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      addAiMessage('⚠️ Please add your birth details first. Go to Birth Chart → enter your date, time, and place of birth → Save. Then come back here to ask your question.');
      return;
    }

    const userMsg = { id: Date.now(), isUser: true, text: text.trim(), time: formatTime() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const responseText = await getAiChat(text.trim(), birthData, credentials);
      addAiMessage(responseText);
    } catch (err) {
      console.error('[Chat] API error:', err);

      const status = err?.response?.status;
      let errorText = '';

      if (err?.message === 'NO_API_KEY') {
        errorText = '⚠️ API key missing. Please verify your credentials in Settings.';
      } else if (err?.message === 'NO_BIRTH_DATA') {
        errorText = '⚠️ Birth data missing. Please add your birth chart details first.';
      } else if (status === 401 || status === 403) {
        errorText = '⚠️ API key expired or invalid. Please go to Settings and re-enter your Access Token.';
      } else if (status === 429) {
        errorText = '⚠️ Too many requests. Please wait a moment before asking again.';
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
        errorText = '⚠️ Network error. Please check your internet connection and try again.';
      } else {
        errorText = `⚠️ The cosmic channels experienced interference (${status ? `Error ${status}` : 'Unknown error'}). Please try again in a moment.`;
      }

      addAiMessage(errorText);
    } finally {
      setTyping(false);
    }
  };

  const handleSend = () => sendMessage(input);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearChat = () => {
    setMessages([WELCOME_MSG]);
    storage.setChatHistory([WELCOME_MSG]);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div className="page-with-sidebar">
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔮</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
                  VedaGuru — Vedic Astrological Guide
                </div>
                <div style={{ fontSize: '0.75rem', color: hasApiKey && hasBirthData ? '#4ade80' : '#f87171' }}>
                  {hasApiKey && hasBirthData ? '● Online' : hasApiKey ? '● Birth data needed' : '● API key needed'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {(!hasApiKey || !hasBirthData) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(!hasApiKey ? '/settings' : '/birth-chart')}
                  style={{
                    background: 'rgba(255,215,0,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
                  <Settings size={13} />
                  {!hasApiKey ? 'Fix API Key' : 'Add Birth Data'}
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearChat}
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '8px',
                  padding: '0.4rem 0.8rem',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                }}
              >
                <Trash2 size={14} />
                {t('clear_chat')}
              </motion.button>
            </div>
          </div>

          {/* Inline error banners */}
          {!hasApiKey && (
            <ErrorBanner
              title="API Key Missing"
              detail="Please verify your AstrologyAPI Access Token in Settings to enable predictions."
              actionLabel="Go to Settings"
              onAction={() => navigate('/settings')}
            />
          )}
          {hasApiKey && !hasBirthData && (
            <ErrorBanner
              title="Birth Data Missing"
              detail="Add your date, time, and place of birth to get personalised Vedic insights."
              actionLabel="Add Birth Chart"
              onAction={() => navigate('/birth-chart')}
            />
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} isUser={msg.isUser} />
            ))}
            <AnimatePresence>
              {typing && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          <QuickChips onSelect={sendMessage} />

          {/* Input bar */}
          <div style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            background: 'var(--surface)',
          }}>
            <input
              className="input-gold"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!hasApiKey ? 'Set up API key in Settings first…' : !hasBirthData ? 'Add birth data first…' : t('ask_placeholder')}
              style={{ flex: 1, padding: '0.75rem 1rem' }}
            />
            <motion.button
              whileHover={{ scale: 1.08, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: 44, height: 44,
                borderRadius: '50%',
                background: input.trim() ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                color: input.trim() ? '#0A0A1A' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <Send size={18} />
            </motion.button>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
