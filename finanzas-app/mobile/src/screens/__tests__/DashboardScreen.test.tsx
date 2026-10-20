import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DashboardScreen from '../DashboardScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import apiClient from '../../services/apiClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, name: 'Ana Pérez', email: 'ana@example.com', roles: [] } }),
}));
jest.mock('../../services/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

const mockGet = apiClient.get as jest.Mock;

interface Routes {
  summary?: any;
  notifications?: any[];
  cards?: any[];
  cuotas?: any[];
  summaryFails?: boolean;
}

const mockApi = ({ summary, notifications = [], cards = [], cuotas = [], summaryFails }: Routes) => {
  mockGet.mockImplementation((url: string) => {
    if (url === '/summary') {
      return summaryFails ? Promise.reject(new Error('boom')) : Promise.resolve({ data: summary });
    }
    if (url === '/notifications') return Promise.resolve({ data: notifications });
    if (url === '/credit-cards') return Promise.resolve({ data: cards });
    if (url === '/cuotas') return Promise.resolve({ data: cuotas });
    return Promise.resolve({ data: [] });
  });
};

const renderDashboard = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <DashboardScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const nested = (income: number, expenses: number, available: number, extra: any = {}) => ({
  budget: { totalIncome: income, totalExpenses: expenses, available },
  emergencyFund: { current: 750 },
  localCurrency: 'USD',
  ...extra,
});

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the skeleton while the summary loads', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderDashboard();
    expect(screen.getByTestId('dashboard-skeleton')).toBeTruthy();
    expect(screen.queryByText('Disponible del mes')).toBeNull();
  });

  it('maps the nested summary and shows the values', async () => {
    mockApi({ summary: nested(2000, 500, 1500) });
    renderDashboard();
    expect(await screen.findByText('+US$ 1,500.00')).toBeTruthy();
    expect(screen.getByText('US$ 2,000.00')).toBeTruthy();
    expect(screen.getByText('US$ 500.00')).toBeTruthy();
    expect(screen.getByText('US$ 750.00')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('75.0%')).toBeTruthy();
    expect(screen.getByText(/Ana/)).toBeTruthy();
  });

  it('shows an error state and retries the summary', async () => {
    mockApi({ summaryFails: true });
    renderDashboard();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    const calls = () => mockGet.mock.calls.filter(([url]) => url === '/summary').length;
    const before = calls();
    mockApi({ summary: nested(100, 20, 80) });
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(calls()).toBeGreaterThan(before));
    expect(await screen.findByText('+US$ 80.00')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });

  it('handles empty data without breaking', async () => {
    mockApi({ summary: {} });
    renderDashboard();
    expect(await screen.findByText('+US$ 0.00')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText(/Aún no hay movimientos/)).toBeTruthy();
    expect(screen.queryByText('Ingresos vs Gastos')).toBeNull();
    expect(screen.queryByText('Tarjetas de crédito')).toBeNull();
  });

  it('warns when expenses exceed income and caps the ring at 100%', async () => {
    mockApi({ summary: nested(100, 250, -150) });
    renderDashboard();
    expect((await screen.findAllByText('US$ -150.00')).length).toBe(2);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText(/gastando más de lo que ingresas/)).toBeTruthy();
  });

  it('shows the unread badge, cards and active cuotas, and navigates', async () => {
    mockApi({
      summary: nested(1000, 100, 900),
      notifications: [{ id: '1', isRead: false }, { id: '2', isRead: true }, { id: '3', isRead: false }],
      cards: [{ id: 'c1', banco: 'Banco X', nombreTarjeta: 'Visa Oro', lineaCredito: 1000, saldoActual: 250, utilizationPercent: 25 }],
      cuotas: [
        { id: 'q1', description: 'Laptop', totalInstallments: 12, paidInstallments: 3, installmentAmount: 90 },
        { id: 'q2', description: 'Pagada', totalInstallments: 2, paidInstallments: 2, installmentAmount: 10 },
      ],
    });
    renderDashboard();
    expect(await screen.findByText('Visa Oro')).toBeTruthy();
    expect(screen.getByText('Disponible: US$ 750.00')).toBeTruthy();
    expect(screen.getByText('Laptop')).toBeTruthy();
    expect(screen.getByText('3/12')).toBeTruthy();
    expect(screen.queryByText('Pagada')).toBeNull();
    expect(await screen.findByText('2')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Notificaciones'));
    expect(mockNavigate).toHaveBeenCalledWith('Notificaciones');
    fireEvent.press(screen.getByText('Vencimientos'));
    expect(mockNavigate).toHaveBeenCalledWith('Vencimientos');
  });

  it('renders very large amounts', async () => {
    mockApi({ summary: nested(9999999999.99, 123456789.5, 9876543210.49) });
    renderDashboard();
    expect(await screen.findByText('+US$ 9,876,543,210.49')).toBeTruthy();
    expect(screen.getByText('1%')).toBeTruthy();
  });
});
