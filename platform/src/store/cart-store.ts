import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  qty: number;
  rxRequired: boolean;
}

interface CartState {
  items: CartLine[];
  prescriptionId: string | null;
  addItem: (item: CartLine) => void;
  removeItem: (productId: string) => void;
  setPrescription: (id: string | null) => void;
  clear: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      prescriptionId: null,
      addItem: (item) => {
        const existing = get().items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.productId === item.productId ? { ...i, qty: i.qty + item.qty } : i,
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      removeItem: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),
      setPrescription: (id) => set({ prescriptionId: id }),
      clear: () => set({ items: [], prescriptionId: null }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    { name: "gwak-cart" },
  ),
);
