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

import TarjetasScreen from '../TarjetasScreen';
import { creditCardsService } from '../../services/creditCards.service';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/creditCards.service', () => ({
  creditCardsService: { getAll: jest.fn(), remove: jest.fn() },
}));

const svc = creditCardsService as jest.Mocked<typeof creditCardsService>;

const visa = {
  id: 'c1', banco: 'Santander', nombreTarjeta: 'Visa Oro', tasaAnual: 24, saldoActual: '200.00',
  lineaCredito: '1000.00', fechaCorte: '15', fechaPago: '5', tipoPago: 'full',
  createdAt: '', updatedAt: '', utilizationPercent: 20, advisory: '',
};
const master = {
  id: 'c2', banco: 'BBVA', nombreTarjeta: 'Master Black', tasaAnual: 36, saldoActual: 900,
  lineaCredito: 1500, fechaCorte: null, fechaPago: null, tipoPago: 'stopped',
  createdAt: '', updatedAt: '', utilizationPercent: 60, advisory: '',
};

let client: QueryClient;
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <TarjetasScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('TarjetasScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('shows the skeleton while loading', () => {
    svc.getAll.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('tarjetas-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    svc.getAll.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    svc.getAll.mockResolvedValue([visa] as any);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Santander')).toBeTruthy();
  });

  it('shows the empty state with the pinned action', async () => {
    svc.getAll.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('No hay tarjetas registradas')).toBeTruthy();
    expect(screen.getByText('Nueva tarjeta')).toBeTruthy();
  });

  it('lists the cards with computed available credit, utilisation and totals', async () => {
    svc.getAll.mockResolvedValue([visa, master] as any);
    renderScreen();
    expect(await screen.findByText('Santander')).toBeTruthy();
    expect(screen.getByText('Visa Oro')).toBeTruthy();
    // totals: 200 + 900 of 1000 + 1500
    expect(screen.getByText('US$ 1,100.00')).toBeTruthy();
    expect(screen.getByText('US$ 2,500.00')).toBeTruthy();
    expect(screen.getByText('44.0%')).toBeTruthy();
    // per card
    expect(screen.getByText('Saludable 20%')).toBeTruthy();
    expect(screen.getByText('Alto 60%')).toBeTruthy();
    expect(screen.getByText('US$ 800.00')).toBeTruthy();
    expect(screen.getByText('US$ 600.00')).toBeTruthy();
    expect(screen.getByText('24%')).toBeTruthy();
    expect(screen.getByText('Corte: día 15 · Pago: día 5')).toBeTruthy();
    expect(screen.getByText(/^Pago en \d+d$/)).toBeTruthy();
    expect(screen.getByText('Pagás saldo completo')).toBeTruthy();
    expect(screen.getByText('Dejaste de pagar')).toBeTruthy();
  });

  it('navigates to the form to create and to edit', async () => {
    svc.getAll.mockResolvedValue([visa] as any);
    renderScreen();
    await screen.findByText('Santander');
    fireEvent.press(screen.getByText('Nueva tarjeta'));
    expect(mockNavigate).toHaveBeenCalledWith('TarjetaForm', undefined);
    fireEvent.press(screen.getByText('Santander'));
    expect(mockNavigate).toHaveBeenCalledWith('TarjetaForm', { card: visa });
  });

  describe('delete', () => {
    it('asks for confirmation and does not delete until confirmed', async () => {
      svc.getAll.mockResolvedValue([visa] as any);
      renderScreen();
      await screen.findByText('Santander');
      fireEvent.press(screen.getByLabelText('Eliminar tarjeta'));
      expect(alert).toHaveBeenCalledTimes(1);
      expect(svc.remove).not.toHaveBeenCalled();
      alert.mock.calls[0][2].find((b: any) => b.text === 'Cancelar').onPress?.();
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('deletes and invalidates the queries once confirmed', async () => {
      svc.getAll.mockResolvedValue([visa] as any);
      svc.remove.mockResolvedValue(undefined as any);
      renderScreen();
      await screen.findByText('Santander');
      fireEvent.press(screen.getByLabelText('Eliminar tarjeta'));
      alert.mock.calls[0][2].find((b: any) => b.text === 'Eliminar').onPress();
      await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('c1'));
      await waitFor(() =>
        expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['credit-cards'] }),
      );
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
    });

    it('alerts when the delete fails', async () => {
      svc.getAll.mockResolvedValue([visa] as any);
      svc.remove.mockRejectedValue({ response: { data: { message: 'Tarjeta no encontrada' } } });
      renderScreen();
      await screen.findByText('Santander');
      fireEvent.press(screen.getByLabelText('Eliminar tarjeta'));
      alert.mock.calls[0][2].find((b: any) => b.text === 'Eliminar').onPress();
      await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'Tarjeta no encontrada'));
    });
  });
});
