import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface RefreshState {
  tick: number;
  triggerRefresh: () => void;
}

const RefreshContext = createContext<RefreshState | undefined>(undefined);

const INTERVAL_MS = 30_000; // 30 seconds

export function AutoRefresherProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const triggerRefresh = useCallback(() => {
    setTick((t) => t + 1);
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