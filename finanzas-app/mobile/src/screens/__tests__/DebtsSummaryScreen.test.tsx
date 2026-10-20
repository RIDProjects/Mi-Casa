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

import DebtsSummaryScreen from '../debts/DebtsSummaryScreen';
import { debtsService } from '../../services/debts.service';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/debts.service', () => ({
  debtsService: { getAll: jest.fn(), getSummary: jest.fn(), markAsPaid: jest.fn(), delete: jest.fn() },
}));

const svc = debtsService as jest.Mocked<typeof debtsService>;

const debt = (over: any = {}) => ({
  id: 'd1', personName: 'Juan', amount: 100, type: 'they_owe_me', isPaid: false, createdAt: '', updatedAt: '', ...over,
});

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <DebtsSummaryScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('DebtsSummaryScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    svc.getAll.mockImplementation(() => new Promise(() => {}));
    svc.getSummary.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('debts-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries the debts query', async () => {
    svc.getAll.mockRejectedValueOnce(new Error('boom'));
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 0, totalIOwe: 0, balance: 0 });
    renderScreen();
    expect(await screen.findByText('Algo salió mal')).toBeTruthy();
    svc.getAll.mockResolvedValue([debt()]);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Juan')).toBeTruthy();
    expect(svc.getAll).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state when there are no debts', async () => {
    svc.getAll.mockResolvedValue([]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 0, totalIOwe: 0, balance: 0 });
    renderScreen();
    expect(await screen.findByText('Sin deudas registradas')).toBeTruthy();
    expect(screen.getByText('Saldo neto')).toBeTruthy();
  });

  it('shows the net balance, section totals, debt rows and paid history', async () => {
    svc.getAll.mockResolvedValue([
      debt({ id: 'a', personName: 'Juan', amount: 100, note: 'Prestamo' }),
      debt({ id: 'b', personName: 'Luis', amount: 50, type: 'i_owe' }),
      debt({ id: 'c', personName: 'Marta', amount: 50, isPaid: true }),
    ]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 100, totalIOwe: 50, balance: 50 });
    renderScreen();
    expect(await screen.findByText('+US$ 50.00')).toBeTruthy();
    expect(screen.getByText('+US$ 100.00')).toBeTruthy();
    expect(screen.getByText('-US$ 50.00')).toBeTruthy();
    expect(screen.getByText('Juan')).toBeTruthy();
    expect(screen.getByText('+ US$ 100.00')).toBeTruthy();
    expect(screen.getByText('Prestamo')).toBeTruthy();
    expect(screen.getByText('- US$ 50.00')).toBeTruthy();
    expect(screen.getByText('Historial pagadas (1)')).toBeTruthy();
    expect(screen.getByText('Marta')).toBeTruthy();
    expect(screen.getByText('Me debía')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
  });

  it('falls back to the computed totals when the summary is missing and shows empty sections', async () => {
    svc.getAll.mockResolvedValue([debt({ amount: 30 })]);
    svc.getSummary.mockResolvedValue(undefined as any);
    renderScreen();
    expect((await screen.findAllByText('+US$ 30.00')).length).toBe(2);
    expect(screen.getByText('No debes dinero a nadie')).toBeTruthy();
  });

  it('navigates to the add form from the FAB and to edit from a card', async () => {
    svc.getAll.mockResolvedValue([debt()]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 100, totalIOwe: 0, balance: 100 });
    renderScreen();
    await screen.findByText('Juan');
    fireEvent.press(screen.getByLabelText('Registrar deuda'));
    expect(mockNavigate).toHaveBeenCalledWith('AddDebt', {});
    fireEvent.press(screen.getByText('Juan'));
    expect(mockNavigate).toHaveBeenCalledWith('AddDebt', { debtId: 'd1' });
  });

  it('asks for confirmation before marking a debt as paid, then calls the mutation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    svc.getAll.mockResolvedValue([debt()]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 100, totalIOwe: 0, balance: 100 });
    svc.markAsPaid.mockResolvedValue(debt({ isPaid: true }) as any);
    renderScreen();
    await screen.findByText('Juan');
    fireEvent.press(screen.getByLabelText('Marcar como pagada la deuda de Juan'), { stopPropagation: jest.fn() });
    expect(alert).toHaveBeenCalledWith('Marcar como pagada', '¿Confirmar que Juan te pagó?', expect.any(Array));
    expect(svc.markAsPaid).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as any[];
    buttons.find((b) => b.text === 'Confirmar').onPress();
    await waitFor(() => expect(svc.markAsPaid).toHaveBeenCalledWith('d1'));
    alert.mockRestore();
  });
});
