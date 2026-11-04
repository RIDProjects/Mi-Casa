import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlanParamsModal from '../PlanParamsModal';
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

const mockPut = apiClient.put as jest.Mock;

const budget = (over: any = {}): any => ({
  id: 'b1',
  name: 'Hogar',
  year: 2026,
  rule: '50-30-20',
  fiMultiplier: null,
  minInvestmentPercent: null,
  emergencyFundMonths: null,
  entertainmentPercent: null,
  fixedExpensesCapPercent: null,
  incomeSources: [],
  categories: [],
  summary: {},
  ...over,
});

const FIELDS = [
  'Meta FI (× ingreso mensual)',
  'Inversión mínima (%)',
  'Fondo de emergencia (meses)',
  'Ocio (%)',
  'Tope gastos fijos (%)',
];

let client: QueryClient;
let alertSpy: jest.SpyInstance;
const onClose = jest.fn();
const renderModal = (b: any = budget()) => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <PlanParamsModal visible budget={b} onClose={onClose} />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('PlanParamsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockPut.mockResolvedValue({ data: {} });
  });

  it('prefills the defaults for the 50-30-20 rule', () => {
    renderModal();
    const values = FIELDS.map((l) => screen.getByLabelText(l).props.value);
    expect(values).toEqual(['150', '20', '6', '30', '50']);
  });

  it('prefills the defaults for the 70-20-10 rule and prefers overrides (decimal strings)', () => {
    renderModal(budget({ rule: '70-20-10', fiMultiplier: '120.00', emergencyFundMonths: '9.00' }));
    const values = FIELDS.map((l) => screen.getByLabelText(l).props.value);
    expect(values).toEqual(['120', '20', '9', '10', '70']);
  });

  it('saves the exact numeric payload, invalidates the budget and closes', async () => {
    renderModal();
    fireEvent.changeText(screen.getByLabelText(FIELDS[0]), '200');
    fireEvent.changeText(screen.getByLabelText(FIELDS[3]), '12,5');
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockPut).toHaveBeenCalledWith('/budget/b1', {
      fiMultiplier: 200,
      minInvestmentPercent: 20,
      emergencyFundMonths: 6,
      entertainmentPercent: 12.5,
      fixedExpensesCapPercent: 50,
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['budget'] });
  });

  it('reset sends all five fields as null', async () => {
    renderModal(budget({ fiMultiplier: 200 }));
    fireEvent.press(screen.getByText('Restablecer valores'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockPut).toHaveBeenCalledWith('/budget/b1', {
      fiMultiplier: null,
      minInvestmentPercent: null,
      emergencyFundMonths: null,
      entertainmentPercent: null,
      fixedExpensesCapPercent: null,
    });
  });

  it.each([
    ['empty', 1, ''],
    ['non numeric', 1, 'abc'],
    ['negative', 1, '-5'],
    ['over the max (percent)', 1, '101'],
    ['over the max (FI multiplier)', 0, '1001'],
    ['over the max (months)', 2, '121'],
  ])('does not call the API when the value is %s', (_n, index, value) => {
    renderModal();
    fireEvent.changeText(screen.getByLabelText(FIELDS[index as number]), value as string);
    fireEvent.press(screen.getByText('Guardar'));
    expect(mockPut).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getAllByText(/entre 0 y|Ingresa/i).length).toBeGreaterThan(0);
  });

  it('shows the API error and keeps the modal open', async () => {
    mockPut.mockRejectedValue({ response: { data: { message: 'boom' } } });
    renderModal();
    fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'boom'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
