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

import FondoEmergenciaScreen from '../FondoEmergenciaScreen';
import { emergencyFundService } from '../../services/emergencyFund.service';

jest.mock('../../services/emergencyFund.service', () => ({
  emergencyFundService: { getAll: jest.fn(), getCoverage: jest.fn() },
}));

const svc = emergencyFundService as jest.Mocked<typeof emergencyFundService>;

const fund = {
  id: 'f1',
  name: 'Mi Fondo de Emergencia',
  targetMonths: 6,
  minimumMonths: 3,
  savingPeriodMonths: 12,
  currentBalance: '4000.00',
  categories: [
    { name: 'Renta', monthlyAmount: '900.00' },
    { name: 'Luz', monthlyAmount: 100 },
    { name: 'Gas', monthlyAmount: 0 },
  ],
  calculations: {
    totalMonthlyExpenses: 1000,
    optimalFund: 6000,
    minimumFund: 3000,
    monthlySavingsRequired: 250,
    monthsToOptimal: 24,
  },
};
const coverage = { balance: 4000, monthlyExpenses: 1000, monthsCovered: 4, targetMonths: 6, status: 'low' as const };

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <FondoEmergenciaScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('FondoEmergenciaScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    svc.getAll.mockImplementation(() => new Promise(() => {}));
    svc.getCoverage.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('fondo-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    svc.getAll.mockRejectedValue(new Error('boom'));
    svc.getCoverage.mockResolvedValue(coverage);
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    svc.getAll.mockResolvedValue([fund]);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Mi Fondo de Emergencia')).toBeTruthy();
  });

  it('shows the empty state when there is no calculator', async () => {
    svc.getAll.mockResolvedValue([]);
    svc.getCoverage.mockResolvedValue({ ...coverage, balance: 0, monthsCovered: 0, status: 'critical' });
    renderScreen();
    expect(await screen.findByText('Sin calculadoras aún')).toBeTruthy();
  });

  it('shows coverage, status, target vs saved and the monthly figures', async () => {
    svc.getAll.mockResolvedValue([fund]);
    svc.getCoverage.mockResolvedValue(coverage);
    renderScreen();
    expect(await screen.findByText('Mi Fondo de Emergencia')).toBeTruthy();
    expect(screen.getByText('4.0')).toBeTruthy();
    expect(screen.getByText('Cobertura baja')).toBeTruthy();
    expect(screen.getByText('Gastos promedio: US$ 1,000.00/mes')).toBeTruthy();
    expect(screen.getByText('Meta: 6 meses')).toBeTruthy();
    expect(screen.getByText('US$ 4,000.00')).toBeTruthy(); // saved
    expect(screen.getByText('US$ 6,000.00')).toBeTruthy(); // optimal (6 months)
    expect(screen.getByText('Monto óptimo (6 meses)')).toBeTruthy();
    expect(screen.getByText('US$ 3,000.00')).toBeTruthy(); // minimum (3 months)
    expect(screen.getByText('Monto mínimo (3 meses)')).toBeTruthy();
    expect(screen.getByText('US$ 250.00')).toBeTruthy(); // monthly saving
    expect(screen.getByText('67%')).toBeTruthy(); // 4000 / 6000
    expect(screen.getByText('Renta')).toBeTruthy();
    expect(screen.getByText('US$ 900.00')).toBeTruthy();
    expect(screen.getByText('US$ 1,000.00')).toBeTruthy(); // total monthly expenses
  });

  it('maps the critical and safe coverage statuses', async () => {
    svc.getAll.mockResolvedValue([fund]);
    svc.getCoverage.mockResolvedValue({ ...coverage, monthsCovered: 1.5, status: 'critical' });
    renderScreen();
    expect(await screen.findByText('Cobertura crítica')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
  });

  it('renders a fund with missing optional fields and a failed coverage request', async () => {
    svc.getAll.mockResolvedValue([
      { id: 'f2', name: 'Fondo vacío', targetMonths: 6, minimumMonths: 3, savingPeriodMonths: 0 },
    ] as any);
    svc.getCoverage.mockRejectedValue(new Error('no coverage'));
    renderScreen();
    expect(await screen.findByText('Fondo vacío')).toBeTruthy();
    expect(screen.getByText('Sin categorías')).toBeTruthy();
    expect(screen.getAllByText('US$ 0.00').length).toBeGreaterThan(0);
    expect(screen.getByText('—')).toBeTruthy(); // no saving period -> no monthly saving
    expect(screen.queryByText('Cobertura crítica')).toBeNull();
  });
});

describe('monthsLabel', () => {
  it('uses the singular only for exactly one month', () => {
    const { monthsLabel } = require('../FondoEmergenciaScreen');
    expect(monthsLabel(1)).toBe('1 mes');
    expect(monthsLabel(6)).toBe('6 meses');
    expect(monthsLabel(1.5)).toBe('1.5 meses');
  });
});
