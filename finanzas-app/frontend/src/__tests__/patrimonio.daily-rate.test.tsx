import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import PatrimonioPage from '../pages/patrimonio';
import { assetsAPI } from '../services/api';

jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('recharts', () => {
  const Stub = ({ children }: any) => <div>{children}</div>;
  return new Proxy({}, { get: () => Stub });
});
jest.mock('../store/currency.store', () => ({
  useCurrencyStore: () => ({
    activeCurrencyCode: 'USD',
    rates: { CUP: 1, USD: 915 },
    currencies: [
      { currencyCode: 'CUP', symbol: '$', isLocal: true },
      { currencyCode: 'USD', symbol: 'US$', isLocal: false },
    ],
    setActiveCurrency: jest.fn(),
  }),
}));
jest.mock('../services/api', () => ({
  assetsAPI: { getAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  creditCardsAPI: { getAll: jest.fn().mockResolvedValue({ data: [] }) },
  loansAPI: { getAll: jest.fn().mockResolvedValue({ data: [] }) },
  netWorthHistoryAPI: { get: jest.fn().mockResolvedValue({ data: [] }) },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PatrimonioPage /></QueryClientProvider>);
}

describe('PatrimonioPage USD view', () => {
  beforeEach(() => {
    (assetsAPI.getAll as jest.Mock).mockResolvedValue({
      data: { assets: [{ id: 'a1', assetType: 'cash', nombre: 'Caja', valorEstimado: 9150 }], netWorth: 9150 },
    });
  });

  it('has no manual quote input: the day rate comes from the house rates', async () => {
    renderPage();
    await screen.findByText('Caja');
    expect(screen.queryByPlaceholderText(/sin cotización/i)).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('shows the day rate as text and converts with it', async () => {
    renderPage();
    expect(await screen.findByText(/1 USD = 915(\.00)? CUP/)).toBeInTheDocument();
    expect(screen.getAllByText(/10(\.00)?\b/).length).toBeGreaterThan(0);
  });
});
