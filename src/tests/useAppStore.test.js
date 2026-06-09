/**
 * useAppStore.test.js
 * Unit tests for the Zustand app store — Auth, Theme, and Language slices.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from '@testing-library/react';

// ── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ── Mock translations ────────────────────────────────────────────────────────
vi.mock('../utils/i18n', () => ({
  default: {
    en: { welcome: 'Welcome', home: 'Home' },
    hi: { welcome: 'स्वागत', home: 'होम' },
  },
}));

// ── Mock storage util ────────────────────────────────────────────────────────
vi.mock('../utils/storage', () => ({
  KEYS: {
    USER_ID: 'vedastro_user_id',
    API_KEY: 'vedastro_api_key',
    LANG: 'vedastro_lang',
    DARK: 'vedastro_dark',
  },
  storage: {
    get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
    setCredentials: vi.fn(),
    clear: vi.fn(),
    clearCache: vi.fn(),
  },
  default: {},
}));

// ── Tests ────────────────────────────────────────────────────────────────────
describe('useAppStore', () => {
  let useAppStore;

  beforeEach(async () => {
    // Reset module registry so the store is fresh for each test
    vi.resetModules();
    localStorageMock.clear();
    const mod = await import('../store/useAppStore');
    useAppStore = mod.default;
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  describe('Auth slice', () => {
    it('starts with isAuthenticated = false', () => {
      const { credentials, isAuthenticated } = useAppStore.getState();
      expect(isAuthenticated).toBe(false);
      expect(credentials.apiKey).toBeNull();
    });

    it('login() sets credentials and marks authenticated', () => {
      act(() => {
        useAppStore.getState().login('user1', 'key123', 'orKey456');
      });
      const state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.credentials.userId).toBe('user1');
      expect(state.credentials.apiKey).toBe('key123');
      expect(state.credentials.openRouterKey).toBe('orKey456');
    });

    it('logout() clears credentials', () => {
      act(() => { useAppStore.getState().login('user1', 'key123'); });
      act(() => { useAppStore.getState().logout(); });
      const state = useAppStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.credentials.apiKey).toBeNull();
    });

    it('setOpenRouterKey() only updates openRouterKey', () => {
      act(() => { useAppStore.getState().login('user1', 'key123'); });
      act(() => { useAppStore.getState().setOpenRouterKey('newOrKey'); });
      const state = useAppStore.getState();
      expect(state.credentials.apiKey).toBe('key123');
      expect(state.credentials.openRouterKey).toBe('newOrKey');
    });
  });

  // ── Language ──────────────────────────────────────────────────────────────
  describe('Language slice', () => {
    it('starts with lang = "en"', () => {
      expect(useAppStore.getState().lang).toBe('en');
    });

    it('changeLang() updates language', () => {
      act(() => { useAppStore.getState().changeLang('hi'); });
      expect(useAppStore.getState().lang).toBe('hi');
    });

    it('t() returns translation for current language', () => {
      act(() => { useAppStore.getState().changeLang('hi'); });
      expect(useAppStore.getState().t('welcome')).toBe('स्वागत');
    });

    it('t() falls back to English for missing key', () => {
      act(() => { useAppStore.getState().changeLang('hi'); });
      expect(useAppStore.getState().t('home')).toBe('होम');
    });
  });

  // ── Theme ─────────────────────────────────────────────────────────────────
  describe('Theme slice', () => {
    it('starts in dark mode by default', () => {
      expect(useAppStore.getState().dark).toBe(true);
    });
  });
});
