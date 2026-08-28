import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyCode } from "@/lib/format";

type CurrencyState = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
};

export const useCurrency = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "UGX",
      setCurrency: (currency) => set({ currency }),
    }),
    { name: "drape-currency" },
  ),
);
