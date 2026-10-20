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

import MovimientoFormScreen from '../MovimientoFormScreen';
import { transactionsService } from '../../services/transactions.service';
import { todayLocalISO } from '../../utils/dates';

const mockGoBack = jest.fn();
let mockParams: any = undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../services/transactions.service', () => ({
  transactionsService: { create: jest.fn(), update: jest.fn() },
}));

const svc = transactionsService as jest.Mocked<typeof transactionsService>;

const existing = {
  id: 't3', tipo: 'gasto', concepto: 'Supermercado', categoria: 'Comida', monto: '350.50',
  metodoPago: 'tarjeta', nombreTarjeta: 'Visa', fecha: '2026-10-05T00:00:00.000Z', notas: 'Semanal',
};

let client: QueryClient;
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MovimientoFormScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const submitLabel = 'Registrar movimiento';

describe('MovimientoFormScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = undefined;
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('defaults to an expense dated today (local)', () => {
    renderScreen();
    expect(screen.getByDisplayValue(todayLocalISO())).toBeTruthy();
    expect(screen.getByText('Categoría')).toBeTruthy();
  });

  it('creates an expense with the right payload and invalidates the queries', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Concepto'), '  Almuerzo  ');
    fireEvent.changeText(screen.getByLabelText('Monto'), '12,50');
    fireEvent.press(screen.getByText('Comida'));
    fireEvent.changeText(screen.getByLabelText('Fecha'), '2026-10-09');
    fireEvent.changeText(screen.getByLabelText('Notas (opcional)'), ' con amigos ');
    fireEvent.press(screen.getByText(submitLabel));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create).toHaveBeenCalledWith({
      tipo: 'gasto',
      concepto: 'Almuerzo',
      categoria: 'Comida',
      monto: 12.5,
      metodoPago: 'efectivo',
      nombreTarjeta: '',
      fecha: '2026-10-09',
      notas: 'con amigos',
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
  });

  it('creates an income without a category', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fireEvent.press(screen.getByText('Ingreso variable'));
    expect(screen.queryByText('Categoría')).toBeNull();
    fireEvent.changeText(screen.getByLabelText('Concepto'), 'Freelance');
    fireEvent.changeText(screen.getByLabelText('Monto'), '300');
    fireEvent.press(screen.getByText('Transferencia'));
    fireEvent.press(screen.getByText(submitLabel));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create).toHaveBeenCalledWith({
      tipo: 'ingreso_variable',
      concepto: 'Freelance',
      categoria: '',
      monto: 300,
      metodoPago: 'transferencia',
      nombreTarjeta: '',
      fecha: todayLocalISO(),
      notas: '',
    });
  });

  it('asks for the card name only when paying by card', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    expect(screen.queryByLabelText('Nombre de la tarjeta')).toBeNull();
    fireEvent.press(screen.getByText('Tarjeta'));
    fireEvent.changeText(screen.getByLabelText('Nombre de la tarjeta'), 'Visa');
    fireEvent.changeText(screen.getByLabelText('Concepto'), 'Cine');
    fireEvent.changeText(screen.getByLabelText('Monto'), '10');
    fireEvent.press(screen.getByText('Familia'));
    fireEvent.press(screen.getByText(submitLabel));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create.mock.calls[0][0]).toMatchObject({ metodoPago: 'tarjeta', nombreTarjeta: 'Visa' });
  });

  it('pre-fills the form when editing and sends PUT', async () => {
    mockParams = { transaction: existing };
    svc.update.mockResolvedValue({} as any);
    renderScreen();
    expect(screen.getByDisplayValue('Supermercado')).toBeTruthy();
    expect(screen.getByDisplayValue('350.5')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-10-05')).toBeTruthy();
    expect(screen.getByDisplayValue('Visa')).toBeTruthy();
    expect(screen.getByDisplayValue('Semanal')).toBeTruthy();
    fireEvent.changeText(screen.getByDisplayValue('Supermercado'), 'Supermercado Sur');
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(svc.update).toHaveBeenCalled());
    expect(svc.update).toHaveBeenCalledWith('t3', {
      tipo: 'gasto',
      concepto: 'Supermercado Sur',
      categoria: 'Comida',
      monto: 350.5,
      metodoPago: 'tarjeta',
      nombreTarjeta: 'Visa',
      fecha: '2026-10-05',
      notas: 'Semanal',
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['transactions'] });
  });

  it('shows inline validation errors and does not call the API', () => {
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Fecha'), '');
    fireEvent.press(screen.getByText(submitLabel));
    expect(screen.getByText('Ingresa el concepto.')).toBeTruthy();
    expect(screen.getByText('El monto debe ser mayor a cero.')).toBeTruthy();
    expect(screen.getByText('Selecciona una categoría.')).toBeTruthy();
    expect(screen.getByText('Ingresa una fecha válida (AAAA-MM-DD).')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it.each([['0'], ['-5'], ['abc']])('rejects monto %p', (monto) => {
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Concepto'), 'Algo');
    fireEvent.changeText(screen.getByLabelText('Monto'), monto);
    fireEvent.press(screen.getByText('Comida'));
    fireEvent.press(screen.getByText(submitLabel));
    expect(screen.getByText('El monto debe ser mayor a cero.')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it.each([['2026-02-31'], ['2026-13-01'], ['05/10/2026'], ['2026-1-5']])('rejects fecha %p', (fecha) => {
    renderScreen();
    fireEvent.press(screen.getByText('Ingreso fijo'));
    fireEvent.changeText(screen.getByLabelText('Concepto'), 'Algo');
    fireEvent.changeText(screen.getByLabelText('Monto'), '10');
    fireEvent.changeText(screen.getByLabelText('Fecha'), fecha);
    fireEvent.press(screen.getByText(submitLabel));
    expect(screen.getByText('Ingresa una fecha válida (AAAA-MM-DD).')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('shows an alert on a server error and keeps the form', async () => {
    svc.create.mockRejectedValue({ response: { data: { message: ['concepto inválido', 'otro'] } } });
    renderScreen();
    fireEvent.press(screen.getByText('Ingreso fijo'));
    fireEvent.changeText(screen.getByLabelText('Concepto'), 'Sueldo');
    fireEvent.changeText(screen.getByLabelText('Monto'), '100');
    fireEvent.press(screen.getByText(submitLabel));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'concepto inválido, otro'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Sueldo')).toBeTruthy();
    expect(screen.getByDisplayValue('100')).toBeTruthy();
  });
});
