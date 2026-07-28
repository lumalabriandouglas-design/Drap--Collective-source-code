import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DrapeWordmark from '../brand/DrapeWordmark';
import { useCurrency } from '../../contexts/CurrencyContext';

export default function Footer() {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  const supportedCurrencies = useMemo(() => [
    { code: 'USD' as const, symbol: '$', label: 'US Dollar' },
    { code: 'EUR' as const, symbol: '€', label: 'Euro' },
    { code: 'GBP' as const, symbol: '£', label: 'British Pound' },
  ], []);

  return (
    <footer className="border-t border-border-light bg-ivory-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <DrapeWordmark className="h-7 w-auto" light={false} />
            <p className="mt-4 text-sm text-charcoal-300 max-w-sm leading-relaxed font-light">
              Where emerging fashion designers connect with discerning customers.
              A curated marketplace for the next wave of style.
            </p>
            <div className="gold-divider" />
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-xs tracking-[0.15em] uppercase text-gold-500 font-medium mb-5">Explore</h4>
            <div className="space-y-1">
              <Link to="/browse" className="flex items-center min-h-[44px] text-sm text-charcoal-400 hover:text-charcoal-700 transition-colors font-light">Browse Products</Link>
              <Link to="/join" className="flex items-center min-h-[44px] text-sm text-charcoal-400 hover:text-charcoal-700 transition-colors font-light">Join as Designer</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs tracking-[0.15em] uppercase text-gold-500 font-medium mb-5">Legal</h4>
            <div className="space-y-1">
              <Link to="/privacy" className="flex items-center min-h-[44px] text-sm text-charcoal-400 hover:text-charcoal-700 transition-colors font-light">Privacy Policy</Link>
              <Link to="/terms" className="flex items-center min-h-[44px] text-sm text-charcoal-400 hover:text-charcoal-700 transition-colors font-light">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border-light flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-charcoal-300 font-light tracking-wide">
            &copy; {new Date().getFullYear()} Drapé Collective. All rights reserved.
          </p>

          {/* ── Currency Selector ── */}
          <div className="relative">
            <button
              onClick={() => setIsOpen((o) => !o)}
              className="flex items-center gap-2 min-h-[44px] px-3 rounded-lg bg-ivory-100 hover:bg-ivory-200 text-charcoal-500 text-xs font-medium transition-colors active:scale-95"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              {currency}
              <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                <div className="absolute bottom-full mb-2 right-0 z-20 bg-surface border border-border-light rounded-xl shadow-elevation-2 p-1.5 min-w-[160px] animate-slide-down">
                  {supportedCurrencies.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setIsOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${currency === c.code ? 'bg-gold-50 text-gold-600 font-medium' : 'text-charcoal-400 hover:bg-ivory-100'}`}
                    >
                      <span>{c.symbol} {c.label}</span>
                      <span className="font-mono text-[10px]">{c.code}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
