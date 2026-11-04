import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import MonedasPage from '../pages/configuracion/monedas';
import { houseCurrenciesAPI } from '../services/api';

jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../store/auth.store', () => ({
  useAuthStore: (sel: any) => sel({ user: { house: { id: 'h1' } } }),
}));

let mockCurrencies: any[] = [];
jest.mock('../store/currency.store', () => ({
  useCurrencyStore: () => ({
    currencies: mockCurrencies,
    rates: { CUP: 0.0011, USD: 1 },
    setCurrencies: jest.fn(),
    setRates: jest.fn(),
    setActiveCurrency: jest.fn(),
  }),
}));
jest.mock('../services/api', () => ({
  houseCurrenciesAPI: {
    getAutoRates: jest.fn(), getAll: jest.fn(), getRates: jest.fn(), add: jest.fn(),
    setLocal: jest.fn(), remove: jest.fn(), upsertRate: jest.fn(),
  },
}));

const cur = (code: string, name: string, symbol: string, isLocal = false) => ({
  id: code, currencyCode: code, currencyName: name, symbol, isLocal,
});

function renderPage() {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}><MonedasPage /></QueryClientProvider>);
}

describe('MonedasPage', () => {
  beforeEach(() => {
    mockCurrencies = [cur('USD', 'Dólar Estadounidense', 'US$', true), cur('CUP', 'Peso Cubano', '$')];
    (houseCurrenciesAPI.getAutoRates as jest.Mock).mockResolvedValue({
      data: { enabled: true, available: true, managedCodes: ['USD', 'EUR'] },
    });
  });

  it('shows the code of USD once and never the "US$" symbol', async () => {
    renderPage();
    await screen.findByText('Dólar Estadounidense');
    expect(screen.getAllByText('USD')).toHaveLength(1);
    expect(screen.queryByText('US$')).toBeNull();
  });

  it('treats CUP as automatic when USD is the local currency (no manual rate field)', async () => {
    renderPage();
    await screen.findByText('Peso Cubano');
    expect(await screen.findByText(/Automática \(elToque\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar/i })).toBeNull();
  });
});
