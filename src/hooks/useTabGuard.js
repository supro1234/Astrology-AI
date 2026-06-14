import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useAppStore from '../store/useAppStore';
import { initTabGuard, getViolationMessage } from '../utils/tabSwitchGuard';

/**
 * React hook to enable tab/window/search protection.
 * If a violation occurs, the user is logged out and redirected.
 * 
 * @param {boolean} enabled - Whether the guard should be active
 */
export function useTabGuard(enabled = true) {
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
    const cleanup = initTabGuard(onViolation, { graceMs: 2000 });
    return cleanup;
  }, [enabled, navigate, instantLogout]);
}
