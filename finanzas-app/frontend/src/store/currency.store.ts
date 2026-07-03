import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HouseCurrency {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  locale: string;
  isBase: boolean;
}

interface CurrencyState {
  currencies: HouseCurrency[];
  rates: Record<string, number>; // { USD: 125 } — units of base per 1 unit of foreign
  activeCurrencyCode: string;
  setCurrencies: (currencies: HouseCurrency[]) => void;
  setRates: (rates: Record<string, number>) => void;
  setActiveCurrency: (code: string) => void;
  getBaseCurrency: () => HouseCurrency | undefined;
  getActiveCurrency: () => HouseCurrency | undefined;
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
      getBaseCurrency: () => get().currencies.find(c => c.isBase),
      getActiveCurrency: () =>
        get().currencies.find(c => c.currencyCode === get().activeCurrencyCode) ??
        get().currencies.find(c => c.isBase),
    }),
    { name: 'mi-casa-currency-v2' }
  )
);
