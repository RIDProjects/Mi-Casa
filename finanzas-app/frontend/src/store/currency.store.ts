import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HouseCurrency {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  locale: string;
  isBase: boolean;
  isActive: boolean;
}

interface CurrencyState {
  currencies: HouseCurrency[];
  rates: Record<string, number>; // { USD: 125 } — units of base per 1 unit of foreign
  activeCurrencyCode: string;
  setCurrencies: (currencies: HouseCurrency[]) => void;
  setRates: (rates: Record<string, number>) => void;
  setActiveCurrency: (code: string) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currencies: [],
      rates: {},
      activeCurrencyCode: 'CUP',
      setCurrencies: (currencies) => set({ currencies }),
      setRates: (rates) => set({ rates }),
      setActiveCurrency: (code) => set({ activeCurrencyCode: code }),
    }),
    { name: 'mi-casa-currency-v2' }
  )
);
