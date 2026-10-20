import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddHouseholdExpenseScreen from '../expenses/AddHouseholdExpenseScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import { householdExpensesService } from '../../services/household-expenses.service';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: undefined }),
}));
jest.mock('../../services/household-expenses.service', () => ({
  householdExpensesService: { getMonth: jest.fn(), create: jest.fn(), update: jest.fn() },
}));

const mockGetMonth = householdExpensesService.getMonth as jest.Mock;
const mockCreate = householdExpensesService.create as jest.Mock;

const renderForm = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AddHouseholdExpenseScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('AddHouseholdExpenseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMonth.mockResolvedValue({
      monedaLocal: 'USD',
      monedas: [{ code: 'USD', symbol: '$' }, { code: 'CUP', symbol: '₱' }],
    });
  });

  it('renders the fields, currency options and category chips', async () => {
    renderForm();
    expect(screen.getByText('Descripción')).toBeTruthy();
    expect(screen.getByText('Monto')).toBeTruthy();
    expect(screen.getByText('Lugar (opcional)')).toBeTruthy();
    expect(await screen.findByText('CUP')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
    expect(screen.getByText('Comida')).toBeTruthy();
    expect(screen.getByText('Registrar gasto')).toBeTruthy();
  });

  it('rejects an empty description without calling the mutation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderForm();
    await screen.findByText('CUP');
    fireEvent.press(screen.getByText('Registrar gasto'));
    expect(alertSpy).toHaveBeenCalledWith('Falta la descripción', 'Ingresa una descripción del gasto.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects an invalid amount without calling the mutation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderForm();
    await screen.findByText('CUP');
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Cena afuera, Uber...'), 'Uber');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '0');
    fireEvent.press(screen.getByText('Registrar gasto'));
    expect(alertSpy).toHaveBeenCalledWith('Monto inválido', 'Ingresa un monto mayor a cero.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('submits a valid expense with the picked currency and category, then goes back', async () => {
    mockCreate.mockResolvedValue({});
    renderForm();
    fireEvent.press(await screen.findByText('CUP'));
    fireEvent.press(screen.getByText('Transporte'));
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Cena afuera, Uber...'), '  Uber  ');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '12,5');
    fireEvent.press(screen.getByText('Registrar gasto'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      descripcion: 'Uber',
      monto: 12.5,
      moneda: 'CUP',
      categoria: 'Transporte',
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  it('cancel goes back', async () => {
    renderForm();
    await screen.findByText('CUP');
    fireEvent.press(screen.getByText('Cancelar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
