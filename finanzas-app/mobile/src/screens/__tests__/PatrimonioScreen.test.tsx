import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

import PatrimonioScreen from '../PatrimonioScreen';
import { netWorthService } from '../../services/netWorth.service';

jest.mock('../../services/netWorth.service', () => ({
  netWorthService: { getOverview: jest.fn(), getHistory: jest.fn() },
}));

const svc = netWorthService as jest.Mocked<typeof netWorthService>;

const overview = {
  summary: {
    physicalAssets: 50000,
    cashAssets: 2000,
    totalAssets: 52000,
    totalDebts: 1500,
    netWorth: 50500,
    assets: [
      { id: 'a1', nombre: 'Casa', valorEstimado: '30000.00', assetType: 'physical' as const },
      { id: 'a2', nombre: 'Auto', valorEstimado: 20000, assetType: 'physical' as const },
      { id: 'a3', nombre: 'Cuenta', valorEstimado: 1500, assetType: 'cash' as const },
      { id: 'a4', nombre: 'Caja', valorEstimado: 500, assetType: 'cash' as const },
    ],
  },
  liabilities: [
    { id: 'c1', nombre: 'BBVA Visa', monto: 1200, kind: 'card' as const },
    { id: 'l1', nombre: 'Banco X', monto: 300, kind: 'loan' as const },
  ],
};
const history = [
  { month: '2026-10-01', netWorth: 48000, assets: 49000, liabilities: 1000 },
  { month: '2026-09-01', netWorth: 46000, assets: 47000, liabilities: 1000 },
];

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PatrimonioScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('PatrimonioScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    svc.getOverview.mockImplementation(() => new Promise(() => {}));
    svc.getHistory.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('patrimonio-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    svc.getOverview.mockRejectedValue(new Error('boom'));
    svc.getHistory.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    svc.getOverview.mockResolvedValue(overview);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Casa')).toBeTruthy();
  });

  it('shows the empty state when there are no assets or debts', async () => {
    svc.getOverview.mockResolvedValue({
      summary: { physicalAssets: 0, cashAssets: 0, totalAssets: 0, totalDebts: 0, netWorth: 0, assets: [] },
      liabilities: [],
    });
    svc.getHistory.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Sin patrimonio registrado')).toBeTruthy();
    expect(await screen.findByText('Sin historial disponible todavía')).toBeTruthy();
  });

  it('shows the hero figures and the items grouped by assets and liabilities', async () => {
    svc.getOverview.mockResolvedValue(overview);
    svc.getHistory.mockResolvedValue(history);
    renderScreen();
    expect(await screen.findByText('Casa')).toBeTruthy();
    expect(screen.getByText('US$ 50,500.00')).toBeTruthy(); // net worth
    expect(screen.getAllByText('US$ 50,000.00')).toHaveLength(2); // physical subtotal: hero + group
    expect(screen.getAllByText('US$ 2,000.00')).toHaveLength(2); // cash subtotal: hero + group
    expect(screen.getByText('-US$ 1,500.00')).toBeTruthy(); // debts
    expect(screen.getByText('US$ 30,000.00')).toBeTruthy();
    expect(screen.getByText('US$ 1,500.00')).toBeTruthy(); // Cuenta
    expect(screen.getByText('Cuenta')).toBeTruthy();
    expect(screen.getByText('BBVA Visa')).toBeTruthy();
    expect(screen.getByText('-US$ 1,200.00')).toBeTruthy();
    expect(screen.getByText('Banco X')).toBeTruthy();
    expect(screen.getByText('Tarjeta')).toBeTruthy();
    expect(screen.getByText('Crédito')).toBeTruthy();
  });

  it('lists the history by month', async () => {
    svc.getOverview.mockResolvedValue(overview);
    svc.getHistory.mockResolvedValue(history);
    renderScreen();
    expect(await screen.findByText('Oct 2026')).toBeTruthy();
    expect(screen.getByText('Sep 2026')).toBeTruthy();
    expect(screen.getByText('US$ 48,000.00')).toBeTruthy();
    expect(screen.getByText('US$ 46,000.00')).toBeTruthy();
    expect(svc.getHistory).toHaveBeenCalledWith(12);
  });

  it('shows a negative net worth with a minus sign', async () => {
    svc.getOverview.mockResolvedValue({
      summary: { physicalAssets: 0, cashAssets: 0, totalAssets: 0, totalDebts: 700, netWorth: -700, assets: [] },
      liabilities: [{ id: 'l1', nombre: 'Banco X', monto: 700, kind: 'loan' }],
    });
    svc.getHistory.mockResolvedValue([]);
    renderScreen();
    expect((await screen.findAllByText('-US$ 700.00')).length).toBeGreaterThan(0);
  });

  it('keeps the overview when the history request fails or fields are missing', async () => {
    svc.getOverview.mockResolvedValue({
      summary: { assets: undefined } as any,
      liabilities: [{ id: 'c1', nombre: 'BBVA Visa', monto: 100, kind: 'card' }],
    });
    svc.getHistory.mockRejectedValue(new Error('no history'));
    renderScreen();
    expect(await screen.findByText('BBVA Visa')).toBeTruthy();
    expect(await screen.findByText('No se pudo cargar el historial')).toBeTruthy();
  });
});
