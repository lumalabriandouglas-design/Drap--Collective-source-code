import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/wordmark";
import { CURRENCIES } from "@/lib/format";
import { useCurrency } from "@/lib/currency-store";

export function SiteFooter() {
  const currency = useCurrency((s) => s.currency);
  const setCurrency = useCurrency((s) => s.setCurrency);

  return (
    <footer className="border-t border-border bg-ivory-100">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Wordmark className="text-2xl" />
            <p className="mt-4 max-w-sm text-sm font-light leading-relaxed text-charcoal-400">
              A private marketplace connecting independent Kampala fashion
              designers with discerning collectors. Original cloth, made to be kept.
            </p>
            <div className="gold-line mt-6" />
          </div>
          <div>
            <h4 className="mb-5 text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">
              Explore
            </h4>
            <div className="flex flex-col">
              <Link to="/shop" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Shop the collection
              </Link>
              <Link to="/ateliers" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Ateliers
              </Link>
              <Link to="/journal" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Journal
              </Link>
              <Link to="/join" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Join the house
              </Link>
            </div>
          </div>
          <div>
            <h4 className="mb-5 text-[10px] font-medium uppercase tracking-[0.18em] text-gold-600">
              House
            </h4>
            <div className="flex flex-col">
              <Link to="/desk" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Concierge
              </Link>
              <Link to="/privacy" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Privacy
              </Link>
              <Link to="/terms" className="flex min-h-11 items-center text-sm font-light text-charcoal-500 hover:text-charcoal-800">
                Terms
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs font-light tracking-wide text-charcoal-400">
            © {new Date().getFullYear()} Drapé Collective. All rights reserved.
          </p>
          <label className="flex min-h-11 items-center gap-2 text-xs text-charcoal-500">
            <span className="uppercase tracking-[0.12em]">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
              className="h-10 rounded-lg border border-border bg-ivory-50 px-3 text-xs text-charcoal-700"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </footer>
  );
}
