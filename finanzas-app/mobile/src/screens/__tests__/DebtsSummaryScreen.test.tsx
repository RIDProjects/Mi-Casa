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
  debtsService: { getAll: jest.fn(), getSummary: jest.fn(), getOffset: jest.fn(), markAsPaid: jest.fn(), delete: jest.fn() },
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
  beforeEach(() => {
    jest.clearAllMocks();
    svc.getOffset.mockResolvedValue({ owedToMe: 0, items: [], totalCovered: 0, totalPending: 0, remainingPool: 0 });
  });

  it('shows the priority and coverage of each debt I owe and what passes to the budget', async () => {
    svc.getAll.mockResolvedValue([
      debt({ id: 'o', personName: 'Luis', amount: 200 }),
      debt({ id: 'a', personName: 'Alba', amount: 100, type: 'i_owe', priority: 'alta' }),
      debt({ id: 'b', personName: 'Beto', amount: 150, type: 'i_owe', priority: 'media' }),
      debt({ id: 'c', personName: 'Cata', amount: 80, type: 'i_owe', priority: 'baja' }),
    ]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 200, totalIOwe: 330, balance: -130 });
    svc.getOffset.mockResolvedValue({
      owedToMe: 200,
      items: [
        { id: 'a', label: 'Alba', priority: 'alta', amount: 100, covered: 100, pending: 0, status: 'cubierta' },
        { id: 'b', label: 'Beto', priority: 'media', amount: 150, covered: 100, pending: 50, status: 'parcial' },
        { id: 'c', label: 'Cata', priority: 'baja', amount: 80, covered: 0, pending: 80, status: 'pendiente' },
      ],
      totalCovered: 200,
      totalPending: 130,
      remainingPool: 0,
    });
    renderScreen();

    expect(await screen.findByText('Alba')).toBeTruthy();
    expect(screen.getByText('Prioridad alta')).toBeTruthy();
    expect(screen.getByText('Prioridad media')).toBeTruthy();
    expect(screen.getByText('Prioridad baja')).toBeTruthy();
    expect(screen.getByText('Cubierta')).toBeTruthy();
    expect(screen.getByText('Parcial · faltan US$ 50.00')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Pasa al presupuesto')).toBeTruthy();
    expect(screen.getByText('US$ 130.00')).toBeTruthy();
  });

  it('lists the debts I owe by priority, highest first', async () => {
    svc.getAll.mockResolvedValue([
      debt({ id: 'c', personName: 'Cata', amount: 80, type: 'i_owe', priority: 'baja' }),
      debt({ id: 'a', personName: 'Alba', amount: 100, type: 'i_owe', priority: 'alta' }),
      debt({ id: 'b', personName: 'Beto', amount: 150, type: 'i_owe', priority: 'media' }),
    ]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 0, totalIOwe: 330, balance: -330 });
    renderScreen();

    await screen.findByText('Alba');
    // getAllByText returns the matches in tree order, so this is the order on screen.
    const names = screen.getAllByText(/^(Alba|Beto|Cata)$/).map((n) => n.props.children);
    expect(names).toEqual(['Alba', 'Beto', 'Cata']);
  });

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

  it('navigates to the add form from the action bar and to edit from a card', async () => {
    svc.getAll.mockResolvedValue([debt()]);
    svc.getSummary.mockResolvedValue({ totalTheyOweMe: 100, totalIOwe: 0, balance: 100 });
    renderScreen();
    await screen.findByText('Juan');
    fireEvent.press(screen.getByText('Registrar deuda'));
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
