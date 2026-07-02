import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Currency = 'ARS' | 'USD' | 'CUP';

interface CurrencyState {
  activeCurrency: Currency;
  rates: { USD: number; CUP: number }; // relative to ARS
  setActiveCurrency: (c: Currency) => void;
  setRates: (rates: { USD: number; CUP: number }) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      activeCurrency: 'ARS',
      rates: { USD: 1000, CUP: 0.04 },
      setActiveCurrency: (activeCurrency) => set({ activeCurrency }),
      setRates: (rates) => set({ rates }),
    }),
    { name: 'mi-casa-currency' }
  )
);
