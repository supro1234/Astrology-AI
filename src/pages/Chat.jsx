import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, AlertCircle, Settings, Sparkles, RefreshCw, Brain } from 'lucide-react';
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
  text: '🔮 Namaste! I am VedaGuru, your AI-powered Vedic Astrological Guide.\n\nI can reveal insights about your birth chart, planetary positions, dasha periods, and life predictions based on your unique cosmic blueprint.\n\n💡 **Tip:** Add your OpenRouter key in Settings → AI Chat for deeply personalized Claude 3.5 responses. Without it, I\'ll use enhanced Vedic templates.',
  time: formatTime(),
  confidence: null,
  usedLLM: false,
};

function ErrorBanner({ title, detail, actionLabel, onAction }) {
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

/** Confidence score badge shown on AI messages */
function ConfidenceBadge({ confidence, usedLLM }) {
  if (!confidence) return null;
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? '#4ade80' : pct >= 60 ? '#FFD700' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{
        fontSize: '0.68rem',
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        borderRadius: '999px',
        padding: '0.15rem 0.55rem',
        fontWeight: 700,
      }}>
        ◉ {pct}% confidence
      </span>
      {usedLLM && (
        <span style={{
          fontSize: '0.68rem',
          color: '#a78bfa',
          background: 'rgba(167,139,250,0.1)',
          border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: '999px',
          padding: '0.15rem 0.55rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <Brain size={10} /> Claude 3.5
        </span>
      )}
    </div>
  );
}

export default function Chat() {
  const { t } = useLanguage();
  const { credentials } = useAuth();
  const navigate = useNavigate();
  const birthData = storage.getBirthData();

  const hasApiKey   = !!(credentials?.apiKey);
  const hasBirthData = !!(birthData?.day && birthData?.lat);
  const hasOpenRouterKey = !!(credentials?.openRouterKey);

  const [messages, setMessages] = useState(() => {
    const saved = storage.getChatHistory();
    return saved.length > 0 ? saved : [WELCOME_MSG];
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [retryPayload, setRetryPayload] = useState(null); // { text, historySnapshot }
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    storage.setChatHistory(messages);
  }, [messages]);

  const addAiMessage = (text, meta = {}) => {
    const aiMsg = {
      id: Date.now() + 1,
      isUser: false,
      text,
      time: formatTime(),
      confidence: meta.confidence || null,
      usedLLM: meta.usedLLM || false,
      topic: meta.topic || null,
    };
    setMessages((m) => [...m, aiMsg]);
  };

  const sendMessage = useCallback(async (text, historyOverride = null) => {
    if (!text?.trim()) return;

    if (!hasApiKey) {
      const userMsg = { id: Date.now(), isUser: true, text: text.trim(), time: formatTime() };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      addAiMessage('⚠️ Please verify your API key in Settings before using the chat.');
      return;
    }

    if (!hasBirthData) {
      const userMsg = { id: Date.now(), isUser: true, text: text.trim(), time: formatTime() };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      addAiMessage('⚠️ Please add your birth details first. Go to Birth Chart → enter your date, time, and place of birth → Save.');
      return;
    }

    const userMsg = { id: Date.now(), isUser: true, text: text.trim(), time: formatTime() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);
    setRetryPayload(null);

    // Build conversation history for multi-turn context (last 10 messages)
    const currentHistory = historyOverride || messages;
    const apiHistory = currentHistory
      .filter(m => m.id !== 0) // skip welcome
      .slice(-10)
      .map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const generator = await getAiChat(text.trim(), birthData, credentials, apiHistory);
      
      const aiMsgId = Date.now() + 1;
      let aiText = '';
      
      // Initialize empty message bubble
      setMessages((m) => [...m, {
        id: aiMsgId,
        isUser: false,
        text: '',
        time: formatTime(),
        confidence: null,
        usedLLM: false,
      }]);

      // Stream the response chunks
      for await (const chunkData of generator) {
        aiText += chunkData.chunk;
        
        setMessages((m) => m.map(msg => 
          msg.id === aiMsgId ? { 
            ...msg, 
            text: aiText, 
            confidence: chunkData.confidence, 
            usedLLM: chunkData.usedLLM, 
            topic: chunkData.topic 
          } : msg
        ));
      }

    } catch (err) {
      console.error('[Chat] Error:', err);
      const status = err?.response?.status || err?.status;
      let errorText = '';

      if (err?.message === 'NO_API_KEY') {
        errorText = '⚠️ API key missing. Please verify your credentials in Settings.';
      } else if (err?.message === 'NO_BIRTH_DATA') {
        errorText = '⚠️ Birth data missing. Please add your birth chart details first.';
      } else if (status === 401 || status === 403) {
        errorText = '⚠️ API key expired or invalid. Please go to Settings and re-enter your Access Token.';
      } else if (err?.message?.includes('Rate limited') || status === 429) {
        errorText = '⚠️ The AI is experiencing high traffic and hit a rate limit. Please wait a moment before trying again.';
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
        errorText = '⚠️ Network error. Please check your internet connection and try again.';
      } else {
        errorText = `⚠️ Unexpected Error: ${err?.message || 'The cosmic channels experienced interference.'}`;
      }

      addAiMessage(errorText);
      // Save retry payload so user can retry without re-typing
      setRetryPayload({ text: text.trim(), historySnapshot: currentHistory });
    } finally {
      setTyping(false);
    }
  }, [messages, birthData, credentials, hasApiKey, hasBirthData]);

  const handleSend = () => sendMessage(input);
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleRetry = () => {
    if (!retryPayload) return;
    sendMessage(retryPayload.text, retryPayload.historySnapshot);
  };

  const clearChat = () => {
    setMessages([WELCOME_MSG]);
    storage.setChatHistory([WELCOME_MSG]);
    setRetryPayload(null);
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
                  VedaGuru — Vedic AI Guide
                </div>
                <div style={{ fontSize: '0.72rem', color: hasApiKey && hasBirthData ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {hasApiKey && hasBirthData ? '● Online' : hasApiKey ? '● Birth data needed' : '● API key needed'}
                  {hasOpenRouterKey && (
                    <span style={{ color: '#a78bfa', marginLeft: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Brain size={10} /> Claude 3.5
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!hasOpenRouterKey && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/settings')}
                  style={{
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} /> Add OpenRouter Key
                </motion.button>
              )}
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
              {retryPayload && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetry}
                  style={{
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    color: '#4ade80',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={13} /> Retry
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
              <div key={msg.id}>
                <ChatBubble message={msg} isUser={msg.isUser} />
                {!msg.isUser && msg.confidence && (
                  <div style={{ paddingLeft: '3rem', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                    <ConfidenceBadge confidence={msg.confidence} usedLLM={msg.usedLLM} />
                  </div>
                )}
              </div>
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
              placeholder={
                !hasApiKey ? 'Set up API key in Settings first…'
                : !hasBirthData ? 'Add birth data first…'
                : t('ask_placeholder')
              }
              style={{ flex: 1, padding: '0.75rem 1rem' }}
            />
            <motion.button
              whileHover={{ scale: 1.08, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!input.trim() || typing}
              style={{
                width: 44, height: 44,
                borderRadius: '50%',
                background: input.trim() && !typing
                  ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
                color: input.trim() && !typing ? '#0A0A1A' : 'var(--text-muted)',
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
