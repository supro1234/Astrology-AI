// localStorage key constants
export const KEYS = {
  USER_ID: 'vedastro_user_id',
  API_KEY: 'vedastro_api_key',
  LANG: 'vedastro_lang',
  DARK: 'vedastro_dark',
  BIRTH: 'vedastro_birth',
  CACHE: 'vedastro_cache',
  CHAT_HISTORY: 'vedastro_chat_history',
};

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
  getCredentials: () => ({
    userId: storage.get(KEYS.USER_ID),
    apiKey: null, // strictly in-memory now
  }),
  setCredentials: (userId, apiKey) => {
    storage.set(KEYS.USER_ID, userId);
    // intentionally NOT saving apiKey to localStorage
  },
  getBirthData: () => storage.get(KEYS.BIRTH),
  setBirthData: (data) => storage.set(KEYS.BIRTH, data),
  getCache: () => storage.get(KEYS.CACHE) || {},
  setCache: (data) => storage.set(KEYS.CACHE, data),
  getCacheEntry: (key) => {
    const cache = storage.getCache();
    const entry = cache[key];
    if (!entry) return null;
    const age = Date.now() - entry.timestamp;
    if (age > 24 * 60 * 60 * 1000) return null; // 24h expiry
    return entry.data;
  },
  setCacheEntry: (key, data) => {
    const cache = storage.getCache();
    cache[key] = { data, timestamp: Date.now() };
    storage.setCache(cache);
  },
  clearCache: () => {
    storage.set(KEYS.CACHE, {});
  },
  getChatHistory: () => storage.get(KEYS.CHAT_HISTORY) || [],
  setChatHistory: (msgs) => storage.set(KEYS.CHAT_HISTORY, msgs),
};

export default storage;
