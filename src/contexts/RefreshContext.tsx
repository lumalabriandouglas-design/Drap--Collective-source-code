import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface RefreshState {
  tick: number;
  triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshState | undefined>(undefined);

const INTERVAL_MS = 30_000; // 30 seconds

export function AutoRefresherProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);

  const triggerRefresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        // Only tick while visible — avoids wasted work + errors after long idle
        if (document.visibilityState === 'visible') {
          setTick((t) => t + 1);
        }
      }, INTERVAL_MS);
    }

    function stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        // Immediate refresh when the user returns to the tab
        setTick((t) => t + 1);
        start();
      } else {
        stop();
      }
    }

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <RefreshContext.Provider value={{ tick, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefresh must be used within AutoRefresherProvider');
  return ctx;
}

/** @deprecated use `useRefresh()` instead — kept for cache compatibility */
export function useRefreshSignal() {
  return useRefresh();
}