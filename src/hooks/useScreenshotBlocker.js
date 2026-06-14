import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { initScreenshotBlocker } from '../utils/screenshotBlocker';

/**
 * React hook to enable screenshot blocking in the current component tree.
 * 
 * @param {boolean} enabled - Whether the blocker should be active
 */
export function useScreenshotBlocker(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    // The blocker will call this onBlocked callback whenever it intercepts a screenshot attempt
    const onBlocked = (message) => {
      // Show an aggressive error toast
      toast.error(message, {
        duration: 4000,
        style: {
          background: '#fee2e2', // red-100
          color: '#991b1b', // red-800
          border: '1px solid #f87171',
          fontWeight: 600,
        },
        icon: '🚫',
      });
    };

    const cleanup = initScreenshotBlocker(onBlocked);
    return cleanup;
  }, [enabled]);
}
