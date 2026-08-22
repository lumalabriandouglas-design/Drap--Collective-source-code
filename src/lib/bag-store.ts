import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BagItem = {
  productId: number;
  slug: string;
  name: string;
  designerName: string;
  image: string;
  priceCents: number;
  size: string;
  qty: number;
};

type BagState = {
  items: BagItem[];
  add: (item: Omit<BagItem, "qty">, qty?: number) => void;
  setQty: (productId: number, size: string, qty: number) => void;
  remove: (productId: number, size: string) => void;
  clear: () => void;
};

export const useBag = create<BagState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) => {
        const items = [...get().items];
        const idx = items.findIndex(
          (row) => row.productId === item.productId && row.size === item.size,
        );
        if (idx >= 0) {
          items[idx] = { ...items[idx], qty: Math.min(items[idx].qty + qty, 8) };
        } else {
          items.push({ ...item, qty: Math.min(qty, 8) });
        }
        set({ items });
      },
      setQty: (productId, size, qty) => {
        if (qty < 1) {
          set({
            items: get().items.filter(
              (row) => !(row.productId === productId && row.size === size),
            ),
          });
          return;
        }
        set({
          items: get().items.map((row) =>
            row.productId === productId && row.size === size
              ? { ...row, qty: Math.min(qty, 8) }
              : row,
          ),
        });
      },
      remove: (productId, size) =>
        set({
          items: get().items.filter(
            (row) => !(row.productId === productId && row.size === size),
          ),
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "drape-bag" },
  ),
);

export function bagCount(items: BagItem[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function bagTotal(items: BagItem[]) {
  return items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
}
