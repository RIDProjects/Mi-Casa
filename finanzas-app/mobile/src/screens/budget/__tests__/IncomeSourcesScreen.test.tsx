import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IncomeSourcesScreen from '../IncomeSourcesScreen';
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const budget = (incomeSources: any[]) => ({
  id: 'b1',
  name: 'Hogar',
  year: 2026,
  incomeSources,
  categories: [],
  summary: { totalMonthlyIncome: 1300, totalMonthlyExpenses: 0, available: 1300, alerts: { overBudget: false } },
});

const sources = [
  { id: 'i1', name: 'Sueldo', type: 'salary', amount: 1000 },
  { id: 'i2', name: 'Diseños', type: 'freelance', amount: 300 },
];

let client: QueryClient;
let alertSpy: jest.SpyInstance;
const renderIncome = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <IncomeSourcesScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const expectInvalidated = () => {
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['budget'] });
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
};

describe('IncomeSourcesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    api.get.mockResolvedValue({ data: [budget(sources)] });
  });

  it('shows the skeleton while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderIncome();
    expect(screen.getByTestId('income-skeleton')).toBeTruthy();
  });

  it('lists the income sources with type and total', async () => {
    renderIncome();
    expect(await screen.findByText('Sueldo')).toBeTruthy();
    expect(screen.getByText('Salario')).toBeTruthy();
    expect(screen.getByText('Freelance')).toBeTruthy();
    expect(screen.getByText('US$ 1,000.00')).toBeTruthy();
    expect(screen.getByText('US$ 1,300.00')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    api.get.mockResolvedValue({ data: [budget([])] });
    renderIncome();
    expect(await screen.findByText('Sin fuentes de ingreso')).toBeTruthy();
  });

  it('shows an error state', async () => {
    api.get.mockRejectedValue(new Error('boom'));
    renderIncome();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('validates the form without calling the API', async () => {
    renderIncome();
    await screen.findByText('Sueldo');
    fireEvent.press(screen.getByText('Nuevo ingreso'));
    fireEvent.press(screen.getByText('Guardar'));
    expect(await screen.findByText('Ingresa un nombre.')).toBeTruthy();
    expect(screen.getByText('Ingresa un monto válido (cero o más).')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('adds an income source and invalidates the budget and summary queries', async () => {
    api.post.mockResolvedValue({ data: {} });
    renderIncome();
    await screen.findByText('Sueldo');
    fireEvent.press(screen.getByText('Nuevo ingreso'));
    fireEvent.changeText(screen.getByLabelText('Nombre del ingreso'), 'Alquiler cuarto');
    fireEvent.changeText(screen.getByLabelText('Monto mensual'), '250.50');
    fireEvent.press(screen.getByText('Alquiler'));
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/budget/b1/income', { name: 'Alquiler cuarto', type: 'rental', amount: 250.5 }),
    );
    await waitFor(expectInvalidated);
  });

  it('edits an income source prefilled with its values', async () => {
    api.put.mockResolvedValue({ data: {} });
    renderIncome();
    fireEvent.press(await screen.findByText('Sueldo'));
    expect(screen.getByLabelText('Nombre del ingreso').props.value).toBe('Sueldo');
    expect(screen.getByLabelText('Monto mensual').props.value).toBe('1000');
    fireEvent.changeText(screen.getByLabelText('Monto mensual'), '1200');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/budget/income/i1', { name: 'Sueldo', type: 'salary', amount: 1200 }),
    );
    await waitFor(expectInvalidated);
  });

  it('keeps the form open and alerts on a server error', async () => {
    api.post.mockRejectedValue(new Error('Network Error'));
    renderIncome();
    await screen.findByText('Sueldo');
    fireEvent.press(screen.getByText('Nuevo ingreso'));
    fireEvent.changeText(screen.getByLabelText('Nombre del ingreso'), 'Extra');
    fireEvent.changeText(screen.getByLabelText('Monto mensual'), '10');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Network Error'));
    expect(screen.getByLabelText('Nombre del ingreso').props.value).toBe('Extra');
  });

  it('deletes an income source only after confirmation', async () => {
    api.delete.mockResolvedValue({ data: {} });
    renderIncome();
    fireEvent.press(await screen.findByText('Diseños'));
    fireEvent.press(screen.getByText('Eliminar ingreso'));
    expect(alertSpy).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2];
    buttons.find((b: any) => b.text === 'Eliminar').onPress();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/budget/income/i2'));
    await waitFor(expectInvalidated);
  });
});
