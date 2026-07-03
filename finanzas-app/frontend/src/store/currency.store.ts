import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Currency = 'CUP' | 'MLC' | 'USD';

interface CurrencyState {
  activeCurrency: Currency;
  rates: { MLC: number; USD: number }; // CUP per unit (CUP is base)
  setActiveCurrency: (c: Currency) => void;
  setRates: (rates: { MLC: number; USD: number }) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      activeCurrency: 'CUP',
      rates: { MLC: 120, USD: 125 },
      setActiveCurrency: (activeCurrency) => set({ activeCurrency }),
      setRates: (rates) => set({ rates }),
    }),
    { name: 'mi-casa-currency' }
  )
);
