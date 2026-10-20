import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExpenseRegistryScreen from '../expenses/ExpenseRegistryScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import { householdExpensesService } from '../../services/household-expenses.service';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/household-expenses.service', () => ({
  householdExpensesService: { getMonth: jest.fn(), delete: jest.fn() },
}));

const mockGetMonth = householdExpensesService.getMonth as jest.Mock;

const month = (over: any = {}) => ({
  month: '2026-10',
  monedaLocal: 'USD',
  comprasMercado: [
    { fecha: '2026-10-03', descripcion: 'Compras en Mercado Central', categoria: 'Comida', lugar: 'Mercado Central', totalLocal: 100, totalCUP: 100 },
  ],
  salidas: [
    { id: 's1', fecha: '2026-10-05', descripcion: 'Cena afuera', categoria: 'Salidas', monto: 50, moneda: 'USD', montoLocal: 50, tasaCambio: 1, montoCUP: 50, lugar: 'Restaurante X', mes: '2026-10', createdAt: '' },
  ],
  resumenCategoria: [
    { categoria: 'Salidas', totalCUP: 50 },
    { categoria: 'Comida', totalCUP: 100 },
  ],
  totalCompras: 100,
  totalSalidas: 50,
  total: 150,
  unconvertedItems: 0,
  ...over,
});

const renderRegistry = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ExpenseRegistryScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('ExpenseRegistryScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    mockGetMonth.mockImplementation(() => new Promise(() => {}));
    renderRegistry();
    expect(screen.getByTestId('expenses-skeleton')).toBeTruthy();
  });

  it('shows the month totals, category breakdown and both kinds of rows', async () => {
    mockGetMonth.mockResolvedValue(month());
    renderRegistry();
    expect(await screen.findByText('-US$ 150.00')).toBeTruthy();
    expect(screen.getByText('Total gastos del mes')).toBeTruthy();
    expect(screen.getAllByText('US$ 100.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('US$ 50.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Registros')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Gastos por categoría')).toBeTruthy();
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText('Cena afuera')).toBeTruthy();
    expect(screen.getByText('-US$ 50.00')).toBeTruthy();
    expect(screen.getByText('Compras en Mercado Central')).toBeTruthy();
    expect(screen.getByText('-US$ 100.00')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.queryByText(/no tienen tasa de cambio/)).toBeNull();
  });

  it('warns about items without exchange rate', async () => {
    mockGetMonth.mockResolvedValue(month({ unconvertedItems: 2 }));
    renderRegistry();
    expect(await screen.findByText(/no tienen tasa de cambio/)).toBeTruthy();
  });

  it('only manual expenses are editable and open the form with their id', async () => {
    mockGetMonth.mockResolvedValue(month());
    renderRegistry();
    fireEvent.press(await screen.findByText('Cena afuera'));
    expect(mockNavigate).toHaveBeenCalledWith('AddHouseholdExpense', { expenseId: 's1' });
    mockNavigate.mockClear();
    fireEvent.press(screen.getByText('Compras en Mercado Central'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('the add button opens an empty form', async () => {
    mockGetMonth.mockResolvedValue(month());
    renderRegistry();
    fireEvent.press(await screen.findByText('Registrar gasto'));
    expect(mockNavigate).toHaveBeenCalledWith('AddHouseholdExpense', undefined);
  });

  it('navigates to the previous month and refetches it', async () => {
    mockGetMonth.mockResolvedValue(month());
    renderRegistry();
    await screen.findByText('Cena afuera');
    const first = mockGetMonth.mock.calls[0][0];
    fireEvent.press(screen.getByLabelText('Mes anterior'));
    await waitFor(() => expect(mockGetMonth.mock.calls.some(([m]) => m !== first)).toBe(true));
  });

  it('shows the empty state when the month has no records', async () => {
    mockGetMonth.mockResolvedValue(month({ comprasMercado: [], salidas: [], resumenCategoria: [], total: 0, totalCompras: 0, totalSalidas: 0 }));
    renderRegistry();
    expect(await screen.findByText('Sin gastos')).toBeTruthy();
    expect(screen.queryByText('Gastos por categoría')).toBeNull();
  });

  it('shows an error state and retries', async () => {
    mockGetMonth.mockRejectedValue(new Error('boom'));
    renderRegistry();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    const before = mockGetMonth.mock.calls.length;
    mockGetMonth.mockResolvedValue(month());
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(mockGetMonth.mock.calls.length).toBeGreaterThan(before));
    expect(await screen.findByText('Cena afuera')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });
});
