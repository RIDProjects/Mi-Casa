import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BudgetScreen from '../BudgetScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import apiClient from '../../services/apiClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../../services/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

const exp = (id: string, amount: number, periodicity: string) => ({
  id, name: id, amount, periodicity, isFixed: true, isCreditCard: false, isAntExpense: false,
});

const budget = (over: any = {}) => ({
  id: 'b1',
  name: 'Hogar',
  year: 2026,
  incomeSources: [
    { id: 'i1', name: 'Sueldo', type: 'salary', amount: 300 },
    { id: 'i2', name: 'Extra', type: 'extras', amount: 100 },
  ],
  categories: [
    { id: 'c1', name: 'Servicios', sortOrder: 0, isDefault: false, expenses: [exp('e1', 300, 'quarterly'), exp('e2', 50, 'monthly')] },
    { id: 'c2', name: 'Seguros', sortOrder: 1, isDefault: false, expenses: [exp('e3', 120, 'annual')] },
  ],
  summary: {
    totalMonthlyIncome: 400,
    totalMonthlyExpenses: 160,
    available: 240,
    alerts: { overBudget: false },
  },
  ...over,
});

let client: QueryClient;
const renderBudget = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <BudgetScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('BudgetScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderBudget();
    expect(screen.getByTestId('budget-skeleton')).toBeTruthy();
  });

  it('shows the hero, ring and category cards with periodicity converted to monthly', async () => {
    mockGet.mockResolvedValue({ data: [budget()] });
    renderBudget();
    expect(await screen.findByText('Hogar — 2026')).toBeTruthy();
    expect(screen.getAllByText('US$ 160.00').length).toBeGreaterThan(0);
    expect(screen.getByText('40%')).toBeTruthy();
    expect(screen.getByText('US$ 240.00')).toBeTruthy();
    // quarterly 300 -> 100/mes (+ monthly 50) and annual 120 -> 10/mes
    expect(screen.getByText('US$ 150.00/mes')).toBeTruthy();
    expect(screen.getByText('US$ 10.00/mes')).toBeTruthy();
    expect(screen.getByText('2 gastos')).toBeTruthy();
    expect(screen.getByText('1 gasto')).toBeTruthy();
    expect(screen.getByText('94% del total')).toBeTruthy();
    expect(screen.getByText('6% del total')).toBeTruthy();
    expect(screen.queryByText('Los gastos superan los ingresos')).toBeNull();
  });

  it('converts weekly expenses (factor 12/52) to monthly', async () => {
    mockGet.mockResolvedValue({
      data: [budget({ categories: [{ id: 'c1', name: 'Comida', sortOrder: 0, isDefault: false, expenses: [exp('e1', 60, 'weekly')] }] })],
    });
    renderBudget();
    // 60 / (12/52) = 260
    expect(await screen.findByText('US$ 260.00/mes')).toBeTruthy();
  });

  it('warns when over budget and caps the ring at 100%', async () => {
    mockGet.mockResolvedValue({
      data: [budget({ summary: { totalMonthlyIncome: 100, totalMonthlyExpenses: 250, available: -150, alerts: { overBudget: true } } })],
    });
    renderBudget();
    expect(await screen.findByText('Los gastos superan los ingresos')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('US$ -150.00')).toBeTruthy();
  });

  it('shows the empty state when there is no active budget', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderBudget();
    expect(await screen.findByText('Sin presupuesto activo')).toBeTruthy();
  });

  it('shows an error state and retries', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    renderBudget();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    const before = mockGet.mock.calls.length;
    mockGet.mockResolvedValue({ data: [budget()] });
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(before));
    expect(await screen.findByText('Hogar — 2026')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });

  it('opens the income sources screen from the Ingresos card', async () => {
    mockGet.mockResolvedValue({ data: [budget()] });
    renderBudget();
    expect(await screen.findByText('Ingresos')).toBeTruthy();
    expect(screen.getByText('2 fuentes')).toBeTruthy();
    fireEvent.press(screen.getByText('Ingresos'));
    expect(mockNavigate).toHaveBeenCalledWith('IncomeSources');
  });

  it('opens the category detail when a category card is tapped', async () => {
    mockGet.mockResolvedValue({ data: [budget()] });
    renderBudget();
    fireEvent.press(await screen.findByText('Seguros'));
    expect(mockNavigate).toHaveBeenCalledWith('CategoryDetail', { categoryId: 'c2' });
  });

  it('validates the new category name without calling the API', async () => {
    mockGet.mockResolvedValue({ data: [budget()] });
    renderBudget();
    await screen.findByText('Servicios');
    fireEvent.press(screen.getByText('Nueva categoría'));
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Ingresa un nombre.')).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('creates a category and invalidates the budget and summary queries', async () => {
    mockGet.mockResolvedValue({ data: [budget()] });
    mockPost.mockResolvedValue({ data: {} });
    renderBudget();
    await screen.findByText('Servicios');
    fireEvent.press(screen.getByText('Nueva categoría'));
    fireEvent.changeText(screen.getByLabelText('Nombre de la categoría'), ' Transporte ');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/budget/b1/categories', { name: 'Transporte' }));
    await waitFor(() => {
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['budget'] });
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
    });
  });

  it('keeps the form and alerts when the server rejects the category', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGet.mockResolvedValue({ data: [budget()] });
    mockPost.mockRejectedValue({ response: { data: { message: 'Nombre duplicado' } } });
    renderBudget();
    await screen.findByText('Servicios');
    fireEvent.press(screen.getByText('Nueva categoría'));
    fireEvent.changeText(screen.getByLabelText('Nombre de la categoría'), 'Casa');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Nombre duplicado'));
    expect(screen.getByLabelText('Nombre de la categoría').props.value).toBe('Casa');
  });

  it('does not offer to add a category when there is no budget', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderBudget();
    await screen.findByText('Sin presupuesto activo');
    expect(screen.queryByText('Nueva categoría')).toBeNull();
  });
});
