/**
 * useAppStore — Zustand global store for VedAstroApp
 * Combines: Auth, Theme, and Language slices.
 *
 * The Context providers (AuthContext, ThemeContext, LanguageContext) now read
 * from this store, so all existing component imports continue to work unchanged.
 */
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { storage, KEYS } from '../utils/storage';
import translations from '../utils/i18n';

// ─── Auth Slice ───────────────────────────────────────────────────────────────
const createAuthSlice = (set) => ({
  // Credentials — apiKey & openRouterKey are NEVER persisted (in-memory only)
  credentials: {
    userId: storage.get(KEYS.USER_ID),
    apiKey: null,
    openRouterKey: null,
  },
  isAuthenticated: false,

  login: (userId, apiKey, openRouterKey = null) => {
    storage.setCredentials(userId, apiKey);
    set({
      credentials: { userId, apiKey, openRouterKey },
      isAuthenticated: !!(apiKey),
    });
  },

  setOpenRouterKey: (openRouterKey) =>
    set((state) => ({
      credentials: { ...state.credentials, openRouterKey },
    })),

  logout: () => {
    storage.clear();
    set({
      credentials: { userId: null, apiKey: null, openRouterKey: null },
      isAuthenticated: false,
    });
  },
});

// ─── Theme Slice ──────────────────────────────────────────────────────────────
const applyThemeClass = (dark) => {
  const root = document.documentElement;
  if (dark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
};

const createThemeSlice = (set, get) => ({
  dark: (() => {
    const stored = storage.get(KEYS.DARK);
    return stored === null ? true : stored;
  })(),

  toggleTheme: (event) => {
    const x = event?.clientX ?? window.innerWidth / 2;
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

    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 700);
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
  ...createAuthSlice(set),
  ...createThemeSlice(set, get),
  ...createLanguageSlice(set, get),
}));

export default useAppStore;

// ─── Selector hooks for ergonomic access ─────────────────────────────────────
// useShallow ensures that Zustand performs a shallow comparison on the returned
// object so React won't re-render when the values haven't actually changed.
export const useAuth = () =>
  useAppStore(
    useShallow((s) => ({
      credentials: s.credentials,
      isAuthenticated: s.isAuthenticated,
      login: s.login,
      logout: s.logout,
      setOpenRouterKey: s.setOpenRouterKey,
    }))
  );

export const useTheme = () =>
  useAppStore(
    useShallow((s) => ({ dark: s.dark, toggleTheme: s.toggleTheme }))
  );

export const useLanguage = () =>
  useAppStore(
    useShallow((s) => ({ lang: s.lang, changeLang: s.changeLang, t: s.t }))
  );
