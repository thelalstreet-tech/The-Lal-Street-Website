// client/src/hooks/useIdleTimer.ts
import { useEffect, useRef } from 'react';

interface UseIdleTimerOptions {
  onIdle: () => void;
  idleTime: number; // in milliseconds
  enabled?: boolean;
}

/**
 * Hook to track idle time and trigger callback after specified duration
 */
export const useIdleTimer = ({ onIdle, idleTime, enabled = true }: UseIdleTimerOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Get or set start time
    // Only set new start time if user is not logged in and hasn't dismissed popup
    const getStartTime = (): number => {
      const dismissed = sessionStorage.getItem('loginPopupDismissed');
      const stored = localStorage.getItem('siteVisitStartTime');
      
      // If user dismissed popup in this session, don't reset timer
      if (dismissed && stored) {
        return parseInt(stored, 10);
      }
      
      // If no stored time or user logged out (dismissal cleared), start fresh
      if (!stored) {
        const now = Date.now();
        localStorage.setItem('siteVisitStartTime', now.toString());
        return now;
      }
      
      return parseInt(stored, 10);
    };

    startTimeRef.current = getStartTime();

    // Check if idle time has passed
    const checkIdleTime = () => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const dismissedKey = 'loginPopupDismissed';
      const dismissed = sessionStorage.getItem(dismissedKey);

      // Only show popup if:
      // 1. Idle time has passed
      // 2. User hasn't dismissed it in this session
      // 3. User is not already logged in (checked by parent component)
      if (elapsed >= idleTime && !dismissed) {
        onIdle();
      }
    };

    // Check immediately
    checkIdleTime();

    // Check periodically (every 10 seconds)
    timerRef.current = setInterval(checkIdleTime, 10000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onIdle, idleTime, enabled]);

  // Reset start time (useful when user logs in)
  const resetTimer = () => {
    localStorage.removeItem('siteVisitStartTime');
    startTimeRef.current = null;
  };

  return { resetTimer };
};

