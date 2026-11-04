import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, AlertCircle, Settings, Sparkles, RefreshCw, Brain, ChevronDown, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import { storage } from '../utils/storage';
import { getAiChat } from '../api/astrologyApi';
import { AVAILABLE_MODELS, getModelInfo, DEFAULT_MODEL_ID } from '../utils/aiModels';
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
  text: '🔮 Namaste! I am VedaGuru, your authentic AI Vedic Astrological Guide.\n\nI combine direct live data from your AstrologyAPI birth chart with real-time AI intelligence to provide personalized predictions, planetary insights, dasha analysis, and Vedic remedies.\n\nAsk me anything about your career, marriage, health, finances, or spiritual path!',
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

/** Confidence score badge shown on AI messages with EXACT model used */
function ConfidenceBadge({ confidence, usedLLM, model }) {
  if (!confidence) return null;
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? '#4ade80' : pct >= 60 ? '#FFD700' : '#f87171';
  const modelInfo = getModelInfo(model);

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
          color: modelInfo.badgeColor || '#a78bfa',
          background: `${modelInfo.badgeColor || '#a78bfa'}15`,
          border: `1px solid ${modelInfo.badgeColor || '#a78bfa'}35`,
          borderRadius: '999px',
          padding: '0.15rem 0.55rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          <Brain size={11} /> {modelInfo.name}
          {modelInfo.isFree && (
            <span style={{ fontSize: '0.6rem', opacity: 0.85, background: 'rgba(74,222,128,0.2)', padding: '0 0.3rem', borderRadius: '4px' }}>
              Free
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export default function Chat() {
  const { t } = useLanguage();
  const { credentials, setOpenRouterModel } = useAuth();
  const navigate = useNavigate();
  const birthData = storage.getBirthData();

  const hasApiKey        = !!(credentials?.apiKey || import.meta.env?.VITE_ASTRO_API_KEY);
  const hasBirthData     = !!(birthData?.day && birthData?.lat);
  const hasOpenRouterKey = !!(credentials?.openRouterKey || import.meta.env?.VITE_OPENROUTER_API_KEY);

  const selectedModelId = credentials?.openRouterModel || storage.get('or_model') || import.meta.env?.VITE_OPENROUTER_MODEL || DEFAULT_MODEL_ID;
  const currentModelInfo = getModelInfo(selectedModelId);

  const [messages, setMessages] = useState(() => {
    const saved = storage.getChatHistory();
    return saved.length > 0 ? saved : [WELCOME_MSG];
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [retryPayload, setRetryPayload] = useState(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [liveModels, setLiveModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    storage.setChatHistory(messages);
  }, [messages]);

  // Load 400+ OpenRouter models when user opens model dropdown
  useEffect(() => {
    if (modelDropdownOpen && liveModels.length === 0 && hasOpenRouterKey) {
      setLoadingModels(true);
      const key = credentials?.openRouterKey || import.meta.env?.VITE_OPENROUTER_API_KEY;
      useAppStore.getState().fetchOpenRouterModels(key)
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setLiveModels(list);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingModels(false));
    }
  }, [modelDropdownOpen, liveModels.length, hasOpenRouterKey, credentials?.openRouterKey]);

  // Close model picker dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = (modelId) => {
    setOpenRouterModel(modelId);
    storage.set('or_model', modelId);
    setModelDropdownOpen(false);
    const info = getModelInfo(modelId);
    toast.success(`Active AI: ${info.name}`);
  };

  const addAiMessage = (text, meta = {}) => {
    const aiMsg = {
      id: Date.now() + 1,
      isUser: false,
      text,
      time: formatTime(),
      confidence: meta.confidence || null,
      usedLLM: meta.usedLLM || false,
      model: meta.model || selectedModelId,
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
      addAiMessage('⚠️ Please configure your Astrology API key in .env or Settings to compute charts.');
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

    // Build conversation history for multi-turn context
    const currentHistory = historyOverride || messages;
    const apiHistory = currentHistory
      .filter(m => m.id !== 0 && m.text && !m.text.startsWith('⚠️'))
      .slice(-10)
      .map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const generator = await getAiChat(text.trim(), birthData, credentials, apiHistory);
      
      const aiMsgId = Date.now() + 1;
      let aiText = '';
      
      // Initialize streaming message bubble
      setMessages((m) => [...m, {
        id: aiMsgId,
        isUser: false,
        text: '',
        time: formatTime(),
        confidence: null,
        usedLLM: true,
        model: selectedModelId,
      }]);

      // Stream the response chunks in real-time
      for await (const chunkData of generator) {
        aiText += chunkData.chunk;
        
        setMessages((m) => m.map(msg => 
          msg.id === aiMsgId ? { 
            ...msg, 
            text: aiText, 
            confidence: chunkData.confidence, 
            usedLLM: chunkData.usedLLM, 
            model: chunkData.model || selectedModelId,
            topic: chunkData.topic 
          } : msg
        ));
      }

    } catch (err) {
      console.error('[Chat] Error:', err);
      const status = err?.response?.status || err?.status;
      let errorText = '';

      if (err?.message === 'NO_API_KEY') {
        errorText = '⚠️ Astrology API key missing. Please verify VITE_ASTRO_API_KEY in your .env.';
      } else if (err?.message === 'NO_BIRTH_DATA') {
        errorText = '⚠️ Birth data missing. Please save your birth chart details first.';
      } else if (status === 401 || status === 403) {
        errorText = '⚠️ API key expired or unauthorized. Please verify your Access Token.';
      } else if (err?.message?.includes('Rate limit') || status === 429) {
        errorText = `⚠️ The model ${currentModelInfo.name} is currently rate-limited on OpenRouter. Try switching to a different model in the top right selector!`;
      } else if (err?.message?.includes('Insufficient credits') || status === 402) {
        errorText = `⚠️ Insufficient OpenRouter credits for ${currentModelInfo.name}. Please switch to a Free model like Gemini 2.0 Flash (Free) or Llama 3.3 (Free) using the selector above!`;
      } else if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
        errorText = '⚠️ Network error. Please check your internet connection and try again.';
      } else {
        errorText = `⚠️ AI Chat Error: ${err?.message || 'Could not complete cosmic consultation.'}`;
      }

      addAiMessage(errorText);
      setRetryPayload({ text: text.trim(), historySnapshot: currentHistory });
    } finally {
      setTyping(false);
    }
  }, [messages, birthData, credentials, hasApiKey, hasBirthData, selectedModelId, currentModelInfo]);

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
          
          {/* Chat Header */}
          <div style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface)',
            zIndex: 20,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🔮</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  VedaGuru AI
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    background: hasApiKey && hasBirthData ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                    color: hasApiKey && hasBirthData ? '#4ade80' : '#f87171',
                    border: `1px solid ${hasApiKey && hasBirthData ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
                  }}>
                    {hasApiKey && hasBirthData ? '● Live Chart Connected' : hasApiKey ? '● Birth Data Needed' : '● API Key Missing'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  Real ephemeris calculations via AstrologyAPI + Live OpenRouter LLM
                </div>
              </div>
            </div>

            {/* Top Right Controls & Model Picker */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              
              {/* Dynamic Model Selector Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  style={{
                    background: 'rgba(255,215,0,0.06)',
                    border: '1px solid rgba(255,215,0,0.25)',
                    borderRadius: '10px',
                    padding: '0.4rem 0.75rem',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                  title="Switch OpenRouter AI Model"
                >
                  <Brain size={13} style={{ color: currentModelInfo.badgeColor || 'var(--primary)' }} />
                  <span>{currentModelInfo.name}</span>
                  {currentModelInfo.isFree && (
                    <span style={{ fontSize: '0.62rem', background: 'rgba(74,222,128,0.2)', color: '#4ade80', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                      FREE
                    </span>
                  )}
                  <ChevronDown size={13} style={{ transform: modelDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {modelDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        width: '320px',
                        background: '#0D0D1F',
                        border: '1px solid rgba(255,215,0,0.25)',
                        borderRadius: '12px',
                        padding: '0.65rem',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
                        zIndex: 100,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                          OPENROUTER AI MODELS
                        </span>
                        <button
                          onClick={() => setShowFreeOnly(!showFreeOnly)}
                          style={{
                            fontSize: '0.64rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: showFreeOnly ? 'rgba(0,229,117,0.2)' : 'rgba(255,255,255,0.06)',
                            color: showFreeOnly ? '#00E575' : 'rgba(255,255,255,0.5)',
                            border: showFreeOnly ? '1px solid rgba(0,229,117,0.4)' : '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          {showFreeOnly ? '✓ Free Only' : 'Show All'}
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0.35rem 0.6rem',
                        marginBottom: '0.5rem',
                      }}>
                        <Search size={13} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                        <input
                          type="text"
                          value={modelSearch}
                          onChange={(e) => setModelSearch(e.target.value)}
                          placeholder="Search 400+ models (e.g. gemma, claude)..."
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#fff',
                            fontSize: '0.74rem',
                            width: '100%',
                          }}
                        />
                      </div>

                      {loadingModels && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '0.4rem' }}>
                          Loading live OpenRouter models...
                        </div>
                      )}

                      <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                        {(() => {
                          const base = [...AVAILABLE_MODELS];
                          const ids = new Set(AVAILABLE_MODELS.map(m => m.id));
                          if (Array.isArray(liveModels) && liveModels.length > 0) {
                            for (const m of liveModels) {
                              if (!ids.has(m.id)) {
                                base.push({
                                  id: m.id,
                                  name: m.name || m.id,
                                  tag: m.isFree ? 'Free' : 'Custom',
                                  provider: m.id.split('/')[0] || 'OpenRouter',
                                  badgeColor: m.isFree ? '#00E575' : '#a78bfa',
                                  isFree: m.isFree,
                                });
                                ids.add(m.id);
                              }
                            }
                          }
                          const q = modelSearch.trim().toLowerCase();
                          const filtered = base.filter((m) => {
                            const matchQ = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
                            const matchFree = !showFreeOnly || m.isFree;
                            return matchQ && matchFree;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '1rem' }}>
                                No matching models found.
                              </div>
                            );
                          }

                          return filtered.map((model) => {
                            const isSelected = model.id === selectedModelId;
                            return (
                              <button
                                key={model.id}
                                onClick={() => handleSelectModel(model.id)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: '8px',
                                  background: isSelected ? 'rgba(0,229,117,0.12)' : 'transparent',
                                  border: isSelected ? '1px solid rgba(0,229,117,0.35)' : '1px solid transparent',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '0.25rem',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <div style={{ minWidth: 0, flex: 1, paddingRight: '0.4rem' }}>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: isSelected ? '#00E575' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {model.name}
                                  </div>
                                  <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {model.id}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                                  {model.isFree ? (
                                    <span style={{ fontSize: '0.58rem', background: 'rgba(0,229,117,0.2)', color: '#00E575', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                                      FREE
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.58rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 600 }}>
                                      PAID
                                    </span>
                                  )}
                                  {isSelected && <Check size={14} style={{ color: '#00E575' }} />}
                                </div>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {(!hasApiKey || !hasBirthData) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(!hasApiKey ? '/settings' : '/birth-chart')}
                  style={{
                    background: 'rgba(255,215,0,0.1)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
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
                  {!hasApiKey ? 'Setup Key' : 'Add Birth Data'}
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
                    padding: '0.4rem 0.75rem',
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
                  padding: '0.4rem 0.75rem',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                }}
              >
                <Trash2 size={13} />
                {t('clear_chat')}
              </motion.button>
            </div>
          </div>

          {/* Inline Warning Banners */}
          {!hasApiKey && (
            <ErrorBanner
              title="Astrology API Key Required"
              detail="Astrology API is compulsory. Set VITE_ASTRO_API_KEY in .env or Settings."
              actionLabel="Go to Settings"
              onAction={() => navigate('/settings')}
            />
          )}
          {hasApiKey && !hasBirthData && (
            <ErrorBanner
              title="Birth Data Missing"
              detail="Add your date, time, and city of birth so VedaGuru can calculate your exact planetary positions."
              actionLabel="Add Birth Chart"
              onAction={() => navigate('/birth-chart')}
            />
          )}

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            {messages.map((msg) => (
              <div key={msg.id}>
                <ChatBubble message={msg} isUser={msg.isUser} />
                {!msg.isUser && msg.confidence && (
                  <div style={{ paddingLeft: '3rem', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                    <ConfidenceBadge confidence={msg.confidence} usedLLM={msg.usedLLM} model={msg.model} />
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
                !hasApiKey ? 'Add Astrology API Key in Settings first…'
                : !hasBirthData ? 'Save your Birth Chart first…'
                : `Ask VedaGuru (${currentModelInfo.name})…`
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
