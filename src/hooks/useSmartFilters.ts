import { useState, useCallback, useEffect, useRef } from 'react';

export type SortOption = 'newest' | 'trending';

export interface SmartFilterState {
  category: string;
  searchQuery: string;
  sortBy: SortOption;
}

export interface SmartFilterActions {
  setCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  setSortBy: (sort: SortOption) => void;
  resetFilters: () => void;
}

const DEFAULTS: SmartFilterState = {
  category: 'all',
  searchQuery: '',
  sortBy: 'newest',
};

/**
 * useSmartFilters — filter state manager with sessionStorage persistence.
 *
 * Pass a unique storageKey per page so that navigating away and back
 * (within the same tab session) restores the user's active filters.
 */
export function useSmartFilters(storageKey: string): {
  filters: SmartFilterState;
  actions: SmartFilterActions;
} {
  const [filters, setFilters] = useState<SmartFilterState>(() => {
    try {
      const saved = sessionStorage.getItem(`dc:${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved) as SmartFilterState;
        return { ...DEFAULTS, ...parsed };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULTS };
  });

  /* Persist every change */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      sessionStorage.setItem(`dc:${storageKey}`, JSON.stringify(filters));
    } catch {
      /* storage may be full — ignore gracefully */
    }
  }, [filters, storageKey]);

  const setCategory = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery }));
  }, []);

  const setSortBy = useCallback((sortBy: SortOption) => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULTS });
  }, []);

  return {
    filters,
    actions: { setCategory, setSearchQuery, setSortBy, resetFilters },
  };
}
