import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { SUPPORTED_CURRENCIES, formatCurrency, type CurrencyCode } from '../lib/currency';

interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyState | undefined>(undefined);

const CODE_LIST = SUPPORTED_CURRENCIES.map((c) => c.code);

function findSymbol(code: string): string {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code)?.symbol ?? 'USh';
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('UGX');

  useEffect(() => {
    const stored = localStorage.getItem('drape_currency') as CurrencyCode | null;
    if (stored && CODE_LIST.includes(stored as any)) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem('drape_currency', c);
  };

  const formatPrice = (amount: number) => {
    return formatCurrency(amount, currency);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}