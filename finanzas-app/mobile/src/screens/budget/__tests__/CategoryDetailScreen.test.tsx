import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoryDetailScreen from '../CategoryDetailScreen';
import { ThemeProvider } from '../../../theme/ThemeContext';
import apiClient from '../../../services/apiClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../../../services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGoBack = jest.fn();
let mockParams: any = { categoryId: 'c1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const exp = (id: string, name: string, amount: number, periodicity: string, over: any = {}) => ({
  id, name, amount, periodicity, isFixed: false, isCreditCard: false, isAntExpense: false, ...over,
});

const budget = (categories?: any[]) => ({
  id: 'b1',
  name: 'Hogar',
  year: 2026,
  incomeSources: [],
  categories: categories ?? [
    { id: 'c1', name: 'Servicios', sortOrder: 0, isDefault: false, expenses: [exp('e1', 'Seguro', 120, 'annual'), exp('e2', 'Internet', 50, 'monthly')] },
    { id: 'c2', name: 'Casa', sortOrder: 1, isDefault: true, expenses: [] },
  ],
  summary: { totalMonthlyIncome: 400, totalMonthlyExpenses: 60, available: 340, alerts: { overBudget: false } },
});

let client: QueryClient;
let alertSpy: jest.SpyInstance;
const renderDetail = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <CategoryDetailScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const confirmLastAlert = (label = 'Eliminar') => {
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  buttons.find((b: any) => b.text === label).onPress();
};

const expectInvalidated = () => {
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['budget'] });
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
};

describe('CategoryDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { categoryId: 'c1' };
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    api.get.mockResolvedValue({ data: [budget()] });
  });

  it('shows the skeleton while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderDetail();
    expect(screen.getByTestId('category-skeleton')).toBeTruthy();
  });

  it('lists the expenses with their monthly equivalent', async () => {
    renderDetail();
    expect(await screen.findByText('Servicios')).toBeTruthy();
    expect(screen.getByText('Seguro')).toBeTruthy();
    expect(screen.getByText('Anual · US$ 120.00')).toBeTruthy();
    expect(screen.getByText('US$ 10.00/mes')).toBeTruthy();
    expect(screen.getByText('Internet')).toBeTruthy();
    expect(screen.getByText('US$ 60.00/mes')).toBeTruthy();
  });

  it('shows the empty state for a category without expenses', async () => {
    mockParams = { categoryId: 'c2' };
    renderDetail();
    expect(await screen.findByText('Sin gastos en esta categoría')).toBeTruthy();
  });

  it('shows an error state and retries', async () => {
    api.get.mockRejectedValue(new Error('boom'));
    renderDetail();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    api.get.mockResolvedValue({ data: [budget()] });
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Seguro')).toBeTruthy();
  });

  it('validates the new expense form without calling the API', async () => {
    renderDetail();
    await screen.findByText('Seguro');
    fireEvent.press(screen.getByText('Nuevo gasto'));
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Ingresa un nombre.')).toBeTruthy();
    expect(screen.getByText('Ingresa un monto válido (cero o más).')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('creates an expense and invalidates the budget and summary queries', async () => {
    api.post.mockResolvedValue({ data: {} });
    renderDetail();
    await screen.findByText('Seguro');
    fireEvent.press(screen.getByText('Nuevo gasto'));
    fireEvent.changeText(screen.getByLabelText('Nombre del gasto'), 'Netflix');
    fireEvent.changeText(screen.getByLabelText('Monto'), '12,5');
    fireEvent.press(screen.getByText('Trimestral'));
    fireEvent.press(screen.getByText('Fijo'));
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/budget/categories/c1/expenses', {
        name: 'Netflix',
        amount: 12.5,
        periodicity: 'quarterly',
        isFixed: true,
        isCreditCard: false,
        isAntExpense: false,
      }),
    );
    await waitFor(expectInvalidated);
    await waitFor(() => expect(screen.queryByLabelText('Nombre del gasto')).toBeNull());
  });

  it('edits an expense prefilled with its values', async () => {
    api.put.mockResolvedValue({ data: {} });
    renderDetail();
    fireEvent.press(await screen.findByText('Seguro'));
    expect(screen.getByLabelText('Nombre del gasto').props.value).toBe('Seguro');
    expect(screen.getByLabelText('Monto').props.value).toBe('120');
    fireEvent.changeText(screen.getByLabelText('Monto'), '240');
    fireEvent.press(screen.getByText('Semestral'));
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/budget/expenses/e1', {
        name: 'Seguro',
        amount: 240,
        periodicity: 'semiannual',
        isFixed: false,
        isCreditCard: false,
        isAntExpense: false,
      }),
    );
    await waitFor(expectInvalidated);
  });

  it('keeps the form open and alerts when the server rejects the expense', async () => {
    api.post.mockRejectedValue({ response: { data: { message: ['amount must not be less than 0'] } } });
    renderDetail();
    await screen.findByText('Seguro');
    fireEvent.press(screen.getByText('Nuevo gasto'));
    fireEvent.changeText(screen.getByLabelText('Nombre del gasto'), 'Netflix');
    fireEvent.changeText(screen.getByLabelText('Monto'), '12');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'amount must not be less than 0'));
    expect(screen.getByLabelText('Nombre del gasto').props.value).toBe('Netflix');
    expect(client.invalidateQueries).not.toHaveBeenCalled();
  });

  it('deletes an expense only after confirmation', async () => {
    api.delete.mockResolvedValue({ data: {} });
    renderDetail();
    fireEvent.press(await screen.findByText('Seguro'));
    fireEvent.press(screen.getByText('Eliminar gasto'));
    expect(alertSpy).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    confirmLastAlert();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/budget/expenses/e1'));
    await waitFor(expectInvalidated);
  });

  it('renames the category and validates an empty name', async () => {
    api.patch.mockResolvedValue({ data: {} });
    renderDetail();
    await screen.findByText('Seguro');
    fireEvent.press(screen.getByText('Renombrar'));
    expect(screen.getByLabelText('Nombre de la categoría').props.value).toBe('Servicios');
    fireEvent.changeText(screen.getByLabelText('Nombre de la categoría'), '  ');
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Ingresa un nombre.')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText('Nombre de la categoría'), 'Hogar fijo');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/budget/categories/c1', { name: 'Hogar fijo' }));
    await waitFor(expectInvalidated);
  });

  it('warns that the expenses go with the category, deletes after confirmation and goes back', async () => {
    api.delete.mockResolvedValue({ data: {} });
    renderDetail();
    await screen.findByText('Seguro');
    fireEvent.press(screen.getByText('Eliminar categoría'));
    expect(alertSpy.mock.calls[0][1]).toMatch(/todos los gastos/);
    expect(api.delete).not.toHaveBeenCalled();
    confirmLastAlert();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/budget/categories/c1'));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expectInvalidated();
  });

  it('does not offer to delete a default category', async () => {
    mockParams = { categoryId: 'c2' };
    renderDetail();
    await screen.findByText('Sin gastos en esta categoría');
    expect(screen.queryByText('Eliminar categoría')).toBeNull();
    expect(screen.getByText('Categoría predeterminada')).toBeTruthy();
  });
});
