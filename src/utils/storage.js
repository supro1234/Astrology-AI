// localStorage key constants
export const KEYS = {
  USER_ID:      'vedastro_user_id',
  API_KEY:      'vedastro_api_key',
  LANG:         'vedastro_lang',
  DARK:         'vedastro_dark',
  BIRTH:        'vedastro_birth',
  CACHE:        'vedastro_cache',
  CHAT_HISTORY: 'vedastro_chat_history',
  FONT_SIZE:    'vedastro_fontsize',
};

// Smart TTL per cache category (ms)
const CACHE_TTL = {
  home_summary:  6  * 60 * 60 * 1000,  // 6 hours
  horoscope:     6  * 60 * 60 * 1000,  // 6 hours
  panchang:      1  * 60 * 60 * 1000,  // 1 hour
  dasha:         24 * 60 * 60 * 1000,  // 24 hours
  default:       6  * 60 * 60 * 1000,  // 6 hours
};

function getTTL(key) {
  if (key.startsWith('home_summary'))  return CACHE_TTL.home_summary;
  if (key.startsWith('horoscope'))     return CACHE_TTL.horoscope;
  if (key.startsWith('panchang'))      return CACHE_TTL.panchang;
  if (key.startsWith('dasha'))         return CACHE_TTL.dasha;
  return CACHE_TTL.default;
}

export const storage = {
  get: (key) => {
    try {
      const val = localStorage.getItem(key);
      if (val === null) return null;
      return JSON.parse(val);
    } catch {
      return localStorage.getItem(key);
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage set error:', e);
    }
  },

  remove: (key) => {
    localStorage.removeItem(key);
  },

  clear: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },

  // ─── Credentials (API key intentionally not stored) ──────────────────────
  getCredentials: () => ({
    userId:   storage.get(KEYS.USER_ID),
    apiKey:   null, // strictly in-memory
    openRouterKey: null, // strictly in-memory
  }),

  setCredentials: (userId) => {
    storage.set(KEYS.USER_ID, userId);
    // intentionally NOT saving apiKey or openRouterKey to localStorage
  },

  // ─── Birth data ───────────────────────────────────────────────────────────
  getBirthData:  ()     => storage.get(KEYS.BIRTH),
  setBirthData:  (data) => storage.set(KEYS.BIRTH, data),

  // ─── Smart cache with per-key TTL ─────────────────────────────────────────
  getCache:    ()     => storage.get(KEYS.CACHE) || {},
  setCache:    (data) => storage.set(KEYS.CACHE, data),

  getCacheEntry: (key) => {
    const cache = storage.getCache();
    const entry = cache[key];
    if (!entry) return null;
    const ttl = getTTL(key);
    const age = Date.now() - entry.timestamp;
    if (age > ttl) return null; // smart TTL — not uniform 24h
    return entry.data;
  },

  setCacheEntry: (key, data) => {
    const cache = storage.getCache();
    cache[key] = { data, timestamp: Date.now() };
    storage.setCache(cache);
  },

  /** Invalidate only cache entries matching a prefix pattern */
  invalidateCacheByPattern: (pattern) => {
    const cache = storage.getCache();
    const updated = {};
    Object.entries(cache).forEach(([k, v]) => {
      if (!k.includes(pattern)) updated[k] = v;
    });
    storage.setCache(updated);
  },

  /** Get cache entry with metadata (for debug / settings display) */
  getCacheEntryWithMeta: (key) => {
    const cache = storage.getCache();
    const entry = cache[key];
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    return { data: entry.data, age, stale: age > getTTL(key), timestamp: entry.timestamp };
  },

  clearCache: () => {
    storage.set(KEYS.CACHE, {});
  },

  /** Get total number of cached entries and approximate size */
  getCacheStats: () => {
    const cache = storage.getCache();
    const keys = Object.keys(cache);
    const raw = JSON.stringify(cache);
    return {
      entries: keys.length,
      sizeKb: Math.round(raw.length / 1024),
    };
  },

  // ─── Chat history ─────────────────────────────────────────────────────────
  getChatHistory: () => storage.get(KEYS.CHAT_HISTORY) || [],
  setChatHistory: (msgs) => {
    // Keep only the last 50 messages to prevent unbounded growth
    const trimmed = msgs.slice(-50);
    storage.set(KEYS.CHAT_HISTORY, trimmed);
  },

  // ─── Data export / import ────────────────────────────────────────────────
  exportUserData: () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      birthData:   storage.getBirthData(),
      chatHistory: storage.getChatHistory(),
      settings: {
        lang:     storage.get(KEYS.LANG),
        dark:     storage.get(KEYS.DARK),
        fontSize: storage.get(KEYS.FONT_SIZE),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vedastro_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importUserData: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.birthData)        storage.setBirthData(data.birthData);
      if (data.chatHistory)      storage.setChatHistory(data.chatHistory);
      if (data.settings?.lang)   storage.set(KEYS.LANG, data.settings.lang);
      if (data.settings?.dark !== undefined) storage.set(KEYS.DARK, data.settings.dark);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },
};

export default storage;
