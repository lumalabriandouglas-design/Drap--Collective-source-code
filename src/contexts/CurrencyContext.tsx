export function CurrencyProvider({ children }: { children?: unknown }) {
  return children as never;
}
export function useCurrency() {
  return { currency: "UGX", setCurrency: () => {} };
}
