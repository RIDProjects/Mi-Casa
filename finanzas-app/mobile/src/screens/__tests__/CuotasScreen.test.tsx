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

import CuotasScreen from '../CuotasScreen';
import { cuotasService } from '../../services/cuotas.service';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/cuotas.service', () => ({
  cuotasService: { getAll: jest.fn(), remove: jest.fn(), pay: jest.fn() },
}));

const svc = cuotasService as jest.Mocked<typeof cuotasService>;

const heladera = {
  id: 'q1', description: 'Heladera', store: 'Frávega', totalAmount: '1200.00', totalInstallments: 12,
  paidInstallments: 3, installmentAmount: '100.00', cardLast4: '1234', startDate: '2026-07-01',
  withInterest: true, interestRate: '5.00', createdAt: '', updatedAt: '',
  remainingInstallments: 9, remainingAmount: 900, nextPaymentDate: '2026-10-01', isCompleted: false,
};
const sofa = {
  id: 'q2', description: 'Sofá', store: null, totalAmount: 300, totalInstallments: 6,
  paidInstallments: 6, installmentAmount: 50, cardLast4: null, startDate: '2026-01-01',
  withInterest: false, interestRate: 0, createdAt: '', updatedAt: '',
  remainingInstallments: 0, remainingAmount: 0, nextPaymentDate: '2026-07-01', isCompleted: true,
};

let client: QueryClient;
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <CuotasScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const confirm = (alert: jest.SpyInstance, text: string) =>
  alert.mock.calls[0][2].find((b: any) => b.text === text);

describe('CuotasScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('shows the skeleton while loading', () => {
    svc.getAll.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('cuotas-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    svc.getAll.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    svc.getAll.mockResolvedValue([heladera] as any);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Heladera')).toBeTruthy();
  });

  it('shows the empty state with the pinned action', async () => {
    svc.getAll.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Sin cuotas registradas')).toBeTruthy();
    expect(screen.getByText('Nueva cuota')).toBeTruthy();
  });

  it('lists the plans with progress, monthly amount, remaining and status', async () => {
    svc.getAll.mockResolvedValue([heladera, sofa] as any);
    renderScreen();
    expect(await screen.findByText('Heladera')).toBeTruthy();
    expect(screen.getByText('Frávega')).toBeTruthy();
    expect(screen.getByText('3 de 12 cuotas pagadas')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('6 de 6 cuotas pagadas')).toBeTruthy();
    expect(screen.getByText('Con interés 5%')).toBeTruthy();
    expect(screen.getByText('En curso')).toBeTruthy();
    expect(screen.getByText('Completada')).toBeTruthy();
    expect(screen.getByText(/^Próximo vencimiento: .+ · \*\*\*\* 1234$/)).toBeTruthy();
    // monthly 100 and remaining 9 x 100 appear on the card and in the summary
    expect(screen.getAllByText('US$ 100.00')).toHaveLength(2);
    expect(screen.getAllByText('US$ 900.00')).toHaveLength(2);
    expect(screen.getByText('US$ 50.00')).toBeTruthy();
    expect(screen.getByText('US$ 0.00')).toBeTruthy();
    // summary counts only the active plans
    expect(screen.getByText('Compromiso mensual')).toBeTruthy();
    expect(screen.getByText('Cuotas activas')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Deuda total restante')).toBeTruthy();
  });

  it('navigates to the form to create and to edit', async () => {
    svc.getAll.mockResolvedValue([heladera] as any);
    renderScreen();
    await screen.findByText('Heladera');
    fireEvent.press(screen.getByText('Nueva cuota'));
    expect(mockNavigate).toHaveBeenCalledWith('CuotaForm', undefined);
    fireEvent.press(screen.getByText('Heladera'));
    expect(mockNavigate).toHaveBeenCalledWith('CuotaForm', { cuota: heladera });
  });

  describe('pay', () => {
    it('only offers the payment on plans that are not completed', async () => {
      svc.getAll.mockResolvedValue([heladera, sofa] as any);
      renderScreen();
      await screen.findByText('Heladera');
      expect(screen.getAllByText('Pagar cuota')).toHaveLength(1);
    });

    it('registers the installment and invalidates the queries once confirmed', async () => {
      svc.getAll.mockResolvedValue([heladera] as any);
      svc.pay.mockResolvedValue({} as any);
      renderScreen();
      await screen.findByText('Heladera');
      fireEvent.press(screen.getByText('Pagar cuota'));
      expect(alert).toHaveBeenCalledTimes(1);
      expect(svc.pay).not.toHaveBeenCalled();
      confirm(alert, 'Pagar').onPress();
      await waitFor(() => expect(svc.pay).toHaveBeenCalledWith('q1'));
      await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cuotas'] }));
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
    });

    it('does not pay when the confirmation is cancelled', async () => {
      svc.getAll.mockResolvedValue([heladera] as any);
      renderScreen();
      await screen.findByText('Heladera');
      fireEvent.press(screen.getByText('Pagar cuota'));
      confirm(alert, 'Cancelar').onPress?.();
      expect(svc.pay).not.toHaveBeenCalled();
    });

    it('alerts when the payment fails', async () => {
      svc.getAll.mockResolvedValue([heladera] as any);
      svc.pay.mockRejectedValue({ response: { data: { message: 'Cuota no encontrada' } } });
      renderScreen();
      await screen.findByText('Heladera');
      fireEvent.press(screen.getByText('Pagar cuota'));
      confirm(alert, 'Pagar').onPress();
      await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'Cuota no encontrada'));
    });
  });

  describe('delete', () => {
    it('asks for confirmation and does not delete until confirmed', async () => {
      svc.getAll.mockResolvedValue([heladera] as any);
      renderScreen();
      await screen.findByText('Heladera');
      fireEvent.press(screen.getByLabelText('Eliminar cuota'));
      expect(alert).toHaveBeenCalledTimes(1);
      expect(svc.remove).not.toHaveBeenCalled();
      confirm(alert, 'Cancelar').onPress?.();
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('deletes and invalidates the queries once confirmed', async () => {
      svc.getAll.mockResolvedValue([heladera] as any);
      svc.remove.mockResolvedValue(undefined as any);
      renderScreen();
      await screen.findByText('Heladera');
      fireEvent.press(screen.getByLabelText('Eliminar cuota'));
      confirm(alert, 'Eliminar').onPress();
      await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('q1'));
      await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cuotas'] }));
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
    });

    it('alerts when the delete fails', async () => {
      svc.getAll.mockResolvedValue([heladera] as any);
      svc.remove.mockRejectedValue({ response: { data: { message: 'Cuota no encontrada' } } });
      renderScreen();
      await screen.findByText('Heladera');
      fireEvent.press(screen.getByLabelText('Eliminar cuota'));
      confirm(alert, 'Eliminar').onPress();
      await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'Cuota no encontrada'));
    });
  });
});
