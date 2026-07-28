/**
 * SUPPORTED_CURRENCIES — list of currency codes the app supports.
 * Add new entries here and they'll appear in the footer selector.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'UGX', label: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'GHS', label: 'Ghanaian Cedi', symbol: '₵' },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

/**
 * formatCurrency - Formats a numeric price using Intl.NumberFormat.
 * Falls back gracefully if the currency or locale is unsupported.
 *
 * @param amount  - The numeric price (e.g. 1500)
 * @param currencyCode - ISO 4217 currency code (default: browser locale → stored preference)
 * @returns Formatted string like "$1,500.00" or "€1.500,00"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode?: CurrencyCode,
): string {
  if (amount === null || amount === undefined) return '—';

  // 1) Determine currency code: explicit > localStorage > browser locale
  const stored = !currencyCode
    ? (localStorage.getItem('drape_currency') as CurrencyCode | null)
    : null;
  const code: string = currencyCode ?? stored ?? guessBrowserCurrency();

  try {
    // Derive a sensible locale from the currency for better formatting
    const locale = localeFromCurrency(code);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'JPY' ? 0 : 2,
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    // Final fallback: just return the number with a symbol
    const symbol = SUPPORTED_CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
    return `${symbol}${Number(amount).toLocaleString()}`;
  }
}

/* ─── Helpers ─── */

function guessBrowserCurrency(): string {
  try {
    // navigator.language returns "en-US", "fr-FR", etc.
    // Intl.NumberFormat can derive the preferred currency from the locale
    const locale = navigator.language || 'en-US';
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currencyDisplay: 'code' });
    // Extract the currency code from the formatted output
    const parts = formatter.formatToParts(0);
    const currencyPart = parts.find((p) => p.type === 'currency');
    return currencyPart?.value ?? 'UGX';
  } catch {
    return 'UGX';
  }
}

function localeFromCurrency(code: string): string {
  const map: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    UGX: 'en-UG',
    JPY: 'ja-JP',
    NGN: 'en-NG',
    KES: 'en-KE',
    ZAR: 'en-ZA',
    GHS: 'en-GH',
  };
  return map[code] ?? 'en-US';
}
