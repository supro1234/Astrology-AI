import { useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

export function useAstrologyApi() {
  const { credentials } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callWithCache = useCallback(async (cacheKey, apiFn) => {
    // Check cache first
    const cached = storage.getCacheEntry(cacheKey);
    if (cached) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cached;
    }
    console.log(`[Cache MISS] ${cacheKey} — fetching from API`);
    const data = await apiFn(credentials);
    storage.setCacheEntry(cacheKey, data);
    return data;
  }, [credentials]);

  const callApi = useCallback(async (apiFn, ...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args, credentials);
      return result;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'API call failed';
      setError(msg);
      console.error('[API Error]', msg, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  return { loading, error, callWithCache, callApi, credentials };
}
