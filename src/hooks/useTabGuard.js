import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import { initTabGuard, getViolationMessage } from '../utils/tabSwitchGuard';

/**
 * useTabGuard.js — VedAstro Security Layer
 *
 * React hook to enable tab/window/search protection.
 * Integrates with the ban system: each violation is recorded,
 * and if the threshold is reached the onBanTriggered callback is invoked
 * to immediately switch the UI to the BanScreen without a page reload.
 *
 * @param {boolean}  enabled         - Whether the guard should be active
 * @param {Function} onBanTriggered  - Called with (ban) when device is banned mid-session
 */
export function useTabGuard(enabled = true, onBanTriggered = null) {
  const { instantLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    
    // Get the global setSecurityViolation function directly from the store
    const { setSecurityViolation } = useAppStore.getState();

    const onViolation = (reason) => {
      // 1. Wipe API keys instantly
      if (instantLogout) {
        instantLogout();
      } else {
        // Fallback if instantLogout isn't mapped yet in useAuth
        const storeState = useAppStore.getState();
        if (storeState.instantLogout) storeState.instantLogout();
        else if (storeState.logout) storeState.logout();
      }

      // 2. Set the warning message in global state
      setSecurityViolation(getViolationMessage(reason));

      // 3. Redirect to Welcome page
      navigate('/', { replace: true });
    };

    // Initialize with a 2-second grace period so it doesn't trigger during initial load/animations
    const cleanup = initTabGuard(onViolation, { graceMs: 2000, onBanTriggered });
    return cleanup;
  }, [enabled, navigate, instantLogout, onBanTriggered]);
}
