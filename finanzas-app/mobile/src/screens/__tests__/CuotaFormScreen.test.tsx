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

import CuotaFormScreen from '../CuotaFormScreen';
import { cuotasService } from '../../services/cuotas.service';

const mockGoBack = jest.fn();
let mockParams: any = undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../services/cuotas.service', () => ({
  cuotasService: { create: jest.fn(), update: jest.fn() },
}));

const svc = cuotasService as jest.Mocked<typeof cuotasService>;

const existing = {
  id: 'q1', description: 'Heladera', store: 'Frávega', totalAmount: '1200.00', totalInstallments: 12,
  paidInstallments: 3, installmentAmount: '100.00', cardLast4: '1234', startDate: '2026-07-01T00:00:00.000Z',
  withInterest: true, interestRate: '5.00', createdAt: '', updatedAt: '',
};

let client: QueryClient;
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <CuotaFormScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const fillRequired = () => {
  fireEvent.changeText(screen.getByLabelText('Descripción'), '  Lavarropas ');
  fireEvent.changeText(screen.getByLabelText('Monto total'), '900,50');
  fireEvent.changeText(screen.getByLabelText('Cantidad de cuotas'), '3');
  fireEvent.changeText(screen.getByLabelText('Fecha de inicio'), '2026-10-15');
};

describe('CuotaFormScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = undefined;
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('creates a plan computing the installment amount and invalidates the queries', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fillRequired();
    expect(screen.getByText(/calculado: 300\.17/)).toBeTruthy();
    fireEvent.press(screen.getByText('Registrar cuota'));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create).toHaveBeenCalledWith({
      description: 'Lavarropas',
      totalAmount: 900.5,
      totalInstallments: 3,
      installmentAmount: 300.17,
      startDate: '2026-10-15',
      withInterest: false,
      interestRate: 0,
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cuotas'] });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
  });

  it('sends the explicit installment, store, card and interest rate', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fillRequired();
    fireEvent.changeText(screen.getByLabelText('Monto por cuota'), '310');
    fireEvent.changeText(screen.getByLabelText('Comercio (opcional)'), 'Garbarino');
    fireEvent.changeText(screen.getByLabelText('Últimos 4 dígitos de tarjeta (opcional)'), '4321');
    fireEvent.press(screen.getByLabelText('Con interés'));
    fireEvent.changeText(screen.getByLabelText('Tasa de interés (%)'), '7,5');
    fireEvent.press(screen.getByText('Registrar cuota'));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create).toHaveBeenCalledWith({
      description: 'Lavarropas',
      store: 'Garbarino',
      totalAmount: 900.5,
      totalInstallments: 3,
      installmentAmount: 310,
      startDate: '2026-10-15',
      withInterest: true,
      interestRate: 7.5,
      cardLastFour: '4321',
    });
  });

  it('shows validation messages and makes no API call', () => {
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Fecha de inicio'), '');
    fireEvent.press(screen.getByText('Registrar cuota'));
    expect(screen.getByText('Ingresa una descripción.')).toBeTruthy();
    expect(screen.getByText('El monto total debe ser mayor a cero.')).toBeTruthy();
    expect(screen.getByText('Ingresa entre 1 y 48 cuotas.')).toBeTruthy();
    expect(screen.getByText('Ingresa una fecha válida (AAAA-MM-DD).')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('validates the installments, card digits and interest rate', () => {
    renderScreen();
    fillRequired();
    fireEvent.changeText(screen.getByLabelText('Cantidad de cuotas'), '49');
    fireEvent.changeText(screen.getByLabelText('Monto por cuota'), '-5');
    fireEvent.changeText(screen.getByLabelText('Últimos 4 dígitos de tarjeta (opcional)'), '12');
    fireEvent.press(screen.getByLabelText('Con interés'));
    fireEvent.changeText(screen.getByLabelText('Tasa de interés (%)'), '120');
    fireEvent.changeText(screen.getByLabelText('Fecha de inicio'), '2026-02-31');
    fireEvent.press(screen.getByText('Registrar cuota'));
    expect(screen.getByText('Ingresa entre 1 y 48 cuotas.')).toBeTruthy();
    expect(screen.getByText('El monto por cuota debe ser mayor a cero.')).toBeTruthy();
    expect(screen.getByText('Ingresa los 4 últimos dígitos.')).toBeTruthy();
    expect(screen.getByText('La tasa de interés debe estar entre 0 y 100 (%)')).toBeTruthy();
    expect(screen.getByText('Ingresa una fecha válida (AAAA-MM-DD).')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('keeps the form and alerts on a server error', async () => {
    svc.create.mockRejectedValue({ response: { data: { message: ['startDate inválida', 'otro'] } } });
    renderScreen();
    fillRequired();
    fireEvent.press(screen.getByText('Registrar cuota'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'startDate inválida, otro'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Lavarropas')).toBeTruthy();
  });

  it('prefills and updates an existing plan', async () => {
    mockParams = { cuota: existing };
    svc.update.mockResolvedValue({} as any);
    renderScreen();
    expect(screen.getByDisplayValue('Heladera')).toBeTruthy();
    expect(screen.getByDisplayValue('Frávega')).toBeTruthy();
    expect(screen.getByDisplayValue('1200')).toBeTruthy();
    expect(screen.getByDisplayValue('2026-07-01')).toBeTruthy();
    expect(screen.getByDisplayValue('1234')).toBeTruthy();
    expect(screen.getByDisplayValue('5')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Monto por cuota'), '110');
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(svc.update).toHaveBeenCalled());
    expect(svc.update).toHaveBeenCalledWith('q1', {
      description: 'Heladera',
      store: 'Frávega',
      totalAmount: 1200,
      totalInstallments: 12,
      installmentAmount: 110,
      startDate: '2026-07-01',
      withInterest: true,
      interestRate: 5,
      cardLastFour: '1234',
    });
    expect(svc.create).not.toHaveBeenCalled();
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });
});
