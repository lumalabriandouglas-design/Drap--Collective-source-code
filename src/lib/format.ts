export const CURRENCIES = [
  { code: "UGX", label: "Ugandan Shilling", symbol: "USh", locale: "en-UG" },
  { code: "USD", label: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", label: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "KES", label: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "NGN", label: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
  { code: "ZAR", label: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "GHS", label: "Ghanaian Cedi", symbol: "₵", locale: "en-GH" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const USD_RATES: Record<CurrencyCode, number> = {
  UGX: 3650,
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  KES: 129,
  NGN: 1550,
  ZAR: 18.2,
  GHS: 15.4,
};

export function formatMoney(amountUgx: number, currency: CurrencyCode = "UGX") {
  const usd = amountUgx / USD_RATES.UGX;
  const amount = currency === "UGX" ? amountUgx : usd * USD_RATES[currency];
  const meta = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const digits = ["UGX", "KES", "NGN"].includes(currency) ? 0 : 0;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${meta.symbol}${Math.round(amount).toLocaleString()}`;
  }
}
