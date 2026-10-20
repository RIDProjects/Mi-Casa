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

import TarjetaFormScreen from '../TarjetaFormScreen';
import { creditCardsService } from '../../services/creditCards.service';

const mockGoBack = jest.fn();
let mockParams: any = undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../services/creditCards.service', () => ({
  creditCardsService: { create: jest.fn(), update: jest.fn() },
}));

const svc = creditCardsService as jest.Mocked<typeof creditCardsService>;

const existing = {
  id: 'c1', banco: 'Santander', nombreTarjeta: 'Visa Oro', tasaAnual: 24, saldoActual: '200.00',
  lineaCredito: '1000.00', fechaCorte: '15', fechaPago: '5', tipoPago: 'minimum',
  createdAt: '', updatedAt: '', utilizationPercent: 20, advisory: '',
};

let client: QueryClient;
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <TarjetaFormScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const fillRequired = () => {
  fireEvent.changeText(screen.getByLabelText('Banco'), '  BBVA ');
  fireEvent.changeText(screen.getByLabelText('Nombre de la tarjeta'), 'Master');
  fireEvent.changeText(screen.getByLabelText('Saldo actual'), '150,50');
  fireEvent.changeText(screen.getByLabelText('Línea de crédito'), '2000');
  fireEvent.changeText(screen.getByLabelText('Tasa anual %'), '30');
};

describe('TarjetaFormScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = undefined;
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('creates a card with the right payload and invalidates the queries', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fillRequired();
    fireEvent.changeText(screen.getByLabelText('Fecha de corte (día)'), '20');
    fireEvent.changeText(screen.getByLabelText('Fecha de pago (día)'), '10');
    fireEvent.press(screen.getByText('Pago parcial'));
    fireEvent.press(screen.getByText('Registrar tarjeta'));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create).toHaveBeenCalledWith({
      banco: 'BBVA',
      nombreTarjeta: 'Master',
      tasaAnual: 30,
      saldoActual: 150.5,
      lineaCredito: 2000,
      fechaCorte: '20',
      fechaPago: '10',
      tipoPago: 'partial',
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['credit-cards'] });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
  });

  it('defaults the payment type to full and omits empty cut/payment days', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fillRequired();
    fireEvent.press(screen.getByText('Registrar tarjeta'));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create.mock.calls[0][0]).toMatchObject({ tipoPago: 'full' });
    expect(svc.create.mock.calls[0][0].fechaCorte).toBeUndefined();
    expect(svc.create.mock.calls[0][0].fechaPago).toBeUndefined();
  });

  it('shows validation messages and makes no API call', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Registrar tarjeta'));
    expect(screen.getByText('Ingresa el banco.')).toBeTruthy();
    expect(screen.getByText('Ingresa el nombre de la tarjeta.')).toBeTruthy();
    expect(screen.getByText('El saldo actual no puede ser negativo.')).toBeTruthy();
    expect(screen.getByText('La línea de crédito debe ser mayor a cero.')).toBeTruthy();
    expect(screen.getByText('La tasa anual debe estar entre 0 y 100 (%)')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('validates the tasa range and the day-of-month fields', () => {
    renderScreen();
    fillRequired();
    fireEvent.changeText(screen.getByLabelText('Tasa anual %'), '120');
    fireEvent.changeText(screen.getByLabelText('Fecha de corte (día)'), '32');
    fireEvent.changeText(screen.getByLabelText('Fecha de pago (día)'), '0');
    fireEvent.press(screen.getByText('Registrar tarjeta'));
    expect(screen.getByText('La tasa anual debe estar entre 0 y 100 (%)')).toBeTruthy();
    expect(screen.getAllByText('Ingresa un día entre 1 y 31.')).toHaveLength(2);
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('keeps the form and alerts on a server error', async () => {
    svc.create.mockRejectedValue({ response: { data: { message: ['tasaAnual inválida', 'otro'] } } });
    renderScreen();
    fillRequired();
    fireEvent.press(screen.getByText('Registrar tarjeta'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'tasaAnual inválida, otro'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('BBVA')).toBeTruthy();
  });

  it('prefills and updates an existing card', async () => {
    mockParams = { card: existing };
    svc.update.mockResolvedValue({} as any);
    renderScreen();
    expect(screen.getByDisplayValue('Santander')).toBeTruthy();
    expect(screen.getByDisplayValue('200')).toBeTruthy();
    expect(screen.getByDisplayValue('1000')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Saldo actual'), '250');
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(svc.update).toHaveBeenCalled());
    expect(svc.update).toHaveBeenCalledWith('c1', {
      banco: 'Santander',
      nombreTarjeta: 'Visa Oro',
      tasaAnual: 24,
      saldoActual: 250,
      lineaCredito: 1000,
      fechaCorte: '15',
      fechaPago: '5',
      tipoPago: 'minimum',
    });
    expect(svc.create).not.toHaveBeenCalled();
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });
});
