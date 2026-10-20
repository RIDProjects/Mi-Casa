import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

import MovimientosScreen from '../MovimientosScreen';
import { transactionsService } from '../../services/transactions.service';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/transactions.service', () => ({
  transactionsService: { getByMonth: jest.fn(), remove: jest.fn() },
}));

const svc = transactionsService as jest.Mocked<typeof transactionsService>;

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;
const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

const salary = {
  id: 't1', tipo: 'ingreso_fijo', concepto: 'Sueldo', categoria: '', monto: '1000.00',
  metodoPago: 'transferencia', nombreTarjeta: null, fecha: `${year}-${String(month).padStart(2, '0')}-01`, notas: null,
};
const freelance = {
  id: 't2', tipo: 'ingreso_variable', concepto: 'Freelance', categoria: '', monto: 200,
  metodoPago: 'efectivo', nombreTarjeta: null, fecha: `${year}-${String(month).padStart(2, '0')}-03T00:00:00.000Z`, notas: null,
};
const groceries = {
  id: 't3', tipo: 'gasto', concepto: 'Supermercado', categoria: 'Comida', monto: 350.5,
  metodoPago: 'tarjeta', nombreTarjeta: 'Visa', fecha: `${year}-${String(month).padStart(2, '0')}-05`, notas: null,
};

let client: QueryClient;
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MovimientosScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('MovimientosScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('shows the skeleton while loading', () => {
    svc.getByMonth.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('movimientos-skeleton')).toBeTruthy();
  });

  it('lists the month with income, expense and balance totals', async () => {
    svc.getByMonth.mockResolvedValue([salary, freelance, groceries] as any);
    renderScreen();
    expect(await screen.findByText('Sueldo')).toBeTruthy();
    expect(svc.getByMonth).toHaveBeenCalledWith(year, month);
    expect(screen.getByText(MONTH_NAMES[month - 1])).toBeTruthy();
    expect(screen.getByText('Balance del mes')).toBeTruthy();
    expect(screen.getByText('US$ 849.50')).toBeTruthy(); // 1200 - 350.50
    expect(screen.getByText('US$ 1,200.00')).toBeTruthy(); // fixed + variable income
    expect(screen.getAllByText('US$ 350.50').length).toBeGreaterThan(0);
    expect(screen.getByText('+US$ 1,000.00')).toBeTruthy(); // string monto
    expect(screen.getByText('+US$ 200.00')).toBeTruthy();
    expect(screen.getByText('-US$ 350.50')).toBeTruthy();
    expect(screen.getByText('Freelance')).toBeTruthy();
    expect(screen.getByText('Supermercado')).toBeTruthy();
  });

  it('shows a negative balance when expenses exceed income', async () => {
    svc.getByMonth.mockResolvedValue([{ ...groceries, monto: 80 }, { ...freelance, monto: 30 }] as any);
    renderScreen();
    expect(await screen.findByText('-US$ 50.00')).toBeTruthy();
  });

  it('refetches when navigating to the previous month', async () => {
    svc.getByMonth.mockResolvedValue([salary] as any);
    renderScreen();
    await screen.findByText('Sueldo');
    fireEvent.press(screen.getByLabelText('Mes anterior'));
    await waitFor(() => expect(svc.getByMonth).toHaveBeenCalledWith(prev.year, prev.month));
    expect(await screen.findByText(MONTH_NAMES[prev.month - 1])).toBeTruthy();
  });

  it('shows the empty state for a month without movements', async () => {
    svc.getByMonth.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Sin movimientos')).toBeTruthy();
    expect(screen.getAllByText('US$ 0.00').length).toBeGreaterThan(0);
  });

  it('shows the error state and retries', async () => {
    svc.getByMonth.mockRejectedValue(new Error('network'));
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    svc.getByMonth.mockResolvedValue([salary] as any);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Sueldo')).toBeTruthy();
  });

  it('opens the form to register and to edit', async () => {
    svc.getByMonth.mockResolvedValue([groceries] as any);
    renderScreen();
    await screen.findByText('Supermercado');
    fireEvent.press(screen.getByText('Registrar movimiento'));
    expect(mockNavigate).toHaveBeenCalledWith('MovimientoForm', undefined);
    fireEvent.press(screen.getByText('Supermercado'));
    expect(mockNavigate).toHaveBeenCalledWith('MovimientoForm', { transaction: groceries });
  });

  describe('delete', () => {
    it('asks for confirmation and does not delete until confirmed', async () => {
      svc.getByMonth.mockResolvedValue([groceries] as any);
      renderScreen();
      await screen.findByText('Supermercado');
      fireEvent.press(screen.getByLabelText('Eliminar movimiento'));
      expect(alert).toHaveBeenCalledTimes(1);
      expect(svc.remove).not.toHaveBeenCalled();
      const cancel = alert.mock.calls[0][2].find((b: any) => b.text === 'Cancelar');
      cancel.onPress?.();
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('deletes and invalidates the queries once confirmed', async () => {
      svc.getByMonth.mockResolvedValue([groceries] as any);
      svc.remove.mockResolvedValue(undefined as any);
      renderScreen();
      await screen.findByText('Supermercado');
      fireEvent.press(screen.getByLabelText('Eliminar movimiento'));
      alert.mock.calls[0][2].find((b: any) => b.text === 'Eliminar').onPress();
      await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('t3'));
      await waitFor(() =>
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] }),
      );
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
    });

    it('alerts when the delete fails', async () => {
      svc.getByMonth.mockResolvedValue([groceries] as any);
      svc.remove.mockRejectedValue({ response: { data: { message: 'No encontrada' } } });
      renderScreen();
      await screen.findByText('Supermercado');
      fireEvent.press(screen.getByLabelText('Eliminar movimiento'));
      alert.mock.calls[0][2].find((b: any) => b.text === 'Eliminar').onPress();
      await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'No encontrada'));
    });
  });
});
