/**
 * useAppStore — Zustand global store for VedAstroApp
 *
 * ✅ FIXED: isOpenRouterConnected was a function stored in state that used
 *    get() — but createAuthSlice was called without get, making get undefined.
 *    Fixed by: storing it as a plain boolean derived value + computed selector.
 *
 * Auth slice now stores:
 *  • credentials.openRouterKey  — the API key string
 *  • credentials.openRouterModel — the selected model ID
 *  • orConnected                 — plain boolean (no function in state)
 */
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { storage, KEYS } from '../utils/storage';
import translations from '../utils/i18n';

// ─── Environment API Keys ─────────────────────────────────────────────────────
const envOpenRouterKey = import.meta.env?.VITE_OPENROUTER_API_KEY?.trim() || '';
const envAstroKey      = import.meta.env?.VITE_ASTRO_API_KEY?.trim()      || '';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const storedOrKey   = storage.get('or_api_key')   || envOpenRouterKey || null;
const storedOrModel = storage.get('or_model')      || 'openai/gpt-4o-mini';

// ─── Auth Slice ───────────────────────────────────────────────────────────────
const createAuthSlice = (set, get) => ({
  currentUser: storage.get(KEYS.AUTH_USER) || (storage.get(KEYS.USER_ID) ? {
    username: storage.get(KEYS.USER_ID),
    name:     storage.get(KEYS.USER_ID),
  } : null),

  credentials: {
    userId:         storage.get(KEYS.USER_ID) || 'seeker',
    apiKey:         envAstroKey || null,
    openRouterKey:  storedOrKey,
    openRouterModel: storedOrModel,
  },

  // plain booleans derived from environment / stored keys
  orConnected:    Boolean(storedOrKey),
  astroConnected: Boolean(envAstroKey),

  isAuthenticated: Boolean(storage.get(KEYS.AUTH_USER) || storage.get(KEYS.USER_ID)),

  login: (identity, password = '', customApiKey = null, customOrKey = null) => {
    let userObj = {};
    if (typeof identity === 'object' && identity !== null) {
      userObj = {
        username:    identity.username || identity.email || 'seeker',
        name:        identity.name     || identity.username || 'Vedic Seeker',
        email:       identity.email    || '',
        avatar:      identity.avatar   || '🔮',
        role:        identity.role     || 'vedic_explorer',
        loggedInAt:  Date.now(),
      };
    } else {
      const cleanName = String(identity || 'seeker').trim();
      userObj = {
        username:   cleanName,
        name:       cleanName,
        email:      cleanName.includes('@') ? cleanName : `${cleanName}@vedastro.app`,
        avatar:     '🔮',
        role:       'vedic_explorer',
        loggedInAt: Date.now(),
      };
    }

    storage.set(KEYS.AUTH_USER, userObj);
    storage.set(KEYS.USER_ID,   userObj.username);

    const openRouterKey = customOrKey || get().credentials.openRouterKey || envOpenRouterKey || null;
    const astroApiKey   = customApiKey || envAstroKey || null;

    set({
      currentUser: userObj,
      credentials: {
        userId:          userObj.username,
        apiKey:          astroApiKey,
        openRouterKey,
        openRouterModel: get().credentials.openRouterModel,
      },
      orConnected:     Boolean(openRouterKey),
      astroConnected:  Boolean(astroApiKey),
      isAuthenticated: true,
    });
  },

  // ── Set OpenRouter key + model, persist to localStorage ───────────────────
  setOpenRouterKey: (key) => {
    const trimmed = (key || '').trim() || null;
    storage.set('or_api_key', trimmed);
    set((state) => ({
      credentials: { ...state.credentials, openRouterKey: trimmed },
      orConnected: Boolean(trimmed),
    }));
  },

  setOpenRouterModel: (model) => {
    storage.set('or_model', model);
    set((state) => ({
      credentials: { ...state.credentials, openRouterModel: model },
    }));
  },

  // ── Set Astrology API key + user, update in-memory credentials ────────────
  setAstrologyKey: (apiKey, userId = null) => {
    const trimmed = (apiKey || '').trim() || null;
    if (userId) storage.set(KEYS.USER_ID, userId);
    set((state) => ({
      credentials: {
        ...state.credentials,
        apiKey: trimmed,
        userId: userId || state.credentials.userId || 'seeker',
      },
      astroConnected: Boolean(trimmed),
    }));
  },

  // ── Test OpenRouter connection (calls the API) ─────────────────────────────
  testOpenRouterConnection: async (customKey = null) => {
    const key = (customKey && customKey.trim()) || get().credentials.openRouterKey;
    if (!key) return { ok: false, error: 'No API key set' };
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { ok: true, modelCount: data?.data?.length || 0 };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  // ── Fetch available models from OpenRouter (400+ models) ────────────────────
  fetchOpenRouterModels: async (customKey = null) => {
    const key = (customKey && customKey.trim()) || get().credentials.openRouterKey;
    try {
      const headers = key ? { Authorization: `Bearer ${key}` } : {};
      const res  = await fetch('https://openrouter.ai/api/v1/models', { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return (data?.data || []).map((m) => ({
        id:          m.id,
        name:        m.name || m.id,
        description: m.description || '',
        pricing:     m.pricing || {},
        isFree:      !m.pricing?.prompt || parseFloat(m.pricing.prompt) === 0 || m.id.includes(':free'),
        context:     m.context_length || 0,
      }));
    } catch {
      return [];
    }
  },

  logout: () => {
    storage.remove(KEYS.AUTH_USER);
    storage.remove(KEYS.USER_ID);
    set({
      currentUser:     null,
      credentials: {
        userId:          null,
        apiKey:          envAstroKey || null,
        openRouterKey:   get().credentials.openRouterKey, // keep OR key on logout
        openRouterModel: get().credentials.openRouterModel,
      },
      isAuthenticated: false,
    });
  },

  instantLogout: () => {
    storage.remove(KEYS.AUTH_USER);
    storage.remove(KEYS.USER_ID);
    set((state) => ({
      currentUser:     null,
      credentials:     { ...state.credentials, apiKey: null },
      isAuthenticated: false,
    }));
  },

  securityViolation:    null,
  setSecurityViolation: (reason) => set({ securityViolation: reason }),
});

// ─── Theme Slice ──────────────────────────────────────────────────────────────
const applyThemeClass = (dark) => {
  const root = document.documentElement;
  root.classList.toggle('dark',  dark);
  root.classList.toggle('light', !dark);
};

const createThemeSlice = (set, get) => ({
  dark: (() => {
    const stored = storage.get(KEYS.DARK);
    return stored === null ? true : stored;
  })(),

  toggleTheme: (event) => {
    const x = event?.clientX ?? window.innerWidth  / 2;
    const y = event?.clientY ?? window.innerHeight / 2;

    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple';
    overlay.style.setProperty('--ripple-x', `${x}px`);
    overlay.style.setProperty('--ripple-y', `${y}px`);
    overlay.style.background = get().dark ? '#FFFDF5' : '#0A0A1A';
    document.body.appendChild(overlay);

    setTimeout(() => {
      const nextDark = !get().dark;
      storage.set(KEYS.DARK, nextDark);
      applyThemeClass(nextDark);
      set({ dark: nextDark });
    }, 180);

    setTimeout(() => overlay.parentNode?.removeChild(overlay), 700);
  },
});

// ─── Language Slice ───────────────────────────────────────────────────────────
const createLanguageSlice = (set, get) => ({
  lang: storage.get(KEYS.LANG) || 'en',

  changeLang: (newLang) => {
    storage.set(KEYS.LANG, newLang);
    set({ lang: newLang });
  },

  t: (key) => {
    const { lang } = get();
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  },
});

// ─── Combined Store ───────────────────────────────────────────────────────────
const useAppStore = create((set, get) => ({
  ...createAuthSlice(set, get),   // ✅ FIX: pass get so actions can read state
  ...createThemeSlice(set, get),
  ...createLanguageSlice(set, get),
}));

export default useAppStore;

// ─── Selector hooks ───────────────────────────────────────────────────────────
export const useAuth = () =>
  useAppStore(
    useShallow((s) => ({
      credentials:              s.credentials,
      orConnected:              s.orConnected,
      astroConnected:           s.astroConnected,
      isAuthenticated:          s.isAuthenticated,
      currentUser:              s.currentUser,
      login:                    s.login,
      logout:                   s.logout,
      instantLogout:            s.instantLogout,
      setOpenRouterKey:         s.setOpenRouterKey,
      setOpenRouterModel:       s.setOpenRouterModel,
      setAstrologyKey:          s.setAstrologyKey,
      testOpenRouterConnection: s.testOpenRouterConnection,
      fetchOpenRouterModels:    s.fetchOpenRouterModels,
    }))
  );

export const useTheme = () =>
  useAppStore(useShallow((s) => ({ dark: s.dark, toggleTheme: s.toggleTheme })));

export const useLanguage = () =>
  useAppStore(useShallow((s) => ({ lang: s.lang, changeLang: s.changeLang, t: s.t })));
