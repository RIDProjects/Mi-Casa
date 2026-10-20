import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ShoppingListScreen from '../expenses/ShoppingListScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import { purchasesService } from '../../services/purchases.service';
import { householdExpensesService } from '../../services/household-expenses.service';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../../services/purchases.service', () => ({
  purchasesService: {
    getLists: jest.fn(),
    createList: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));
jest.mock('../../services/household-expenses.service', () => ({
  householdExpensesService: { getMonth: jest.fn() },
}));

const mockGetLists = purchasesService.getLists as jest.Mock;
const mockAddItem = purchasesService.addItem as jest.Mock;
const mockCreateList = purchasesService.createList as jest.Mock;
const mockGetMonth = householdExpensesService.getMonth as jest.Mock;

const now = new Date();
const monthName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const item = (id: string, name: string, quantity: number, unitPrice: number, lugar: string | null) => ({
  id, name, quantity, unitPrice, lugar, currency: 'USD', status: 'pending', createdAt: '', updatedAt: '',
});

const list = (items: any[]) => ({
  id: 'l1', name: monthName, description: null, budget: 0, localCurrencyCode: 'USD', items, createdAt: '', updatedAt: '',
});

const renderShopping = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ShoppingListScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('ShoppingListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMonth.mockResolvedValue({ monedaLocal: 'USD' });
  });

  it('shows the skeleton while loading', () => {
    mockGetLists.mockImplementation(() => new Promise(() => {}));
    renderShopping();
    expect(screen.getByTestId('shopping-skeleton')).toBeTruthy();
  });

  it('shows items grouped by store with subtotals and the grand total', async () => {
    mockGetLists.mockResolvedValue([
      list([item('i1', 'Arroz', 2, 3, 'Mercado'), item('i2', 'Frijoles', 1, 4.5, 'Mercado'), item('i3', 'Jabón', 3, 1, null)]),
    ]);
    renderShopping();
    expect(await screen.findByText('Arroz')).toBeTruthy();
    expect(screen.getByText('Total de la compra')).toBeTruthy();
    expect(screen.getByText('US$ 13.50')).toBeTruthy();
    expect(screen.getByText('3 ítems')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();
    expect(screen.getByText('US$ 10.50')).toBeTruthy();
    expect(screen.getByText('Sin especificar')).toBeTruthy();
    expect(screen.getByText('2 × US$ 3.00')).toBeTruthy();
    expect(screen.getByText('US$ 6.00')).toBeTruthy();
  });

  it('opens the expense registry', async () => {
    mockGetLists.mockResolvedValue([list([item('i1', 'Arroz', 1, 3, 'Mercado')])]);
    renderShopping();
    await screen.findByText('Arroz');
    fireEvent.press(screen.getByText('Ver gastos'));
    expect(mockNavigate).toHaveBeenCalledWith('ExpenseRegistry');
  });

  it('shows the empty state when the list has no items', async () => {
    mockGetLists.mockResolvedValue([]);
    renderShopping();
    expect(await screen.findByText('Lista vacía')).toBeTruthy();
    expect(screen.getByText('0 ítems')).toBeTruthy();
  });

  it('rejects an empty product without calling the API', async () => {
    mockGetLists.mockResolvedValue([]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderShopping();
    await screen.findByText('Lista vacía');
    fireEvent.press(screen.getByText('Agregar'));
    expect(alertSpy).toHaveBeenCalledWith('Falta el producto', 'Ingresa el nombre del producto.');
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('rejects an invalid price without calling the API', async () => {
    mockGetLists.mockResolvedValue([]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    renderShopping();
    await screen.findByText('Lista vacía');
    fireEvent.changeText(screen.getByPlaceholderText('Producto'), 'Leche');
    fireEvent.press(screen.getByText('Agregar'));
    expect(alertSpy).toHaveBeenCalledWith('Precio inválido', 'Ingresa un precio mayor a cero.');
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('creates the monthly list and adds the item', async () => {
    mockGetLists.mockResolvedValue([]);
    mockCreateList.mockResolvedValue({ id: 'new' });
    mockAddItem.mockResolvedValue({});
    renderShopping();
    await screen.findByText('Lista vacía');
    await waitFor(() => expect(mockGetMonth).toHaveBeenCalled());
    fireEvent.changeText(screen.getByPlaceholderText('Producto'), 'Leche');
    fireEvent.changeText(screen.getByPlaceholderText('Precio USD'), '2,5');
    fireEvent.press(screen.getByText('Agregar'));
    await waitFor(() => expect(mockAddItem).toHaveBeenCalled());
    expect(mockCreateList).toHaveBeenCalledWith({ name: monthName });
    expect(mockAddItem.mock.calls[0][0]).toBe('new');
    expect(mockAddItem.mock.calls[0][1]).toMatchObject({ name: 'Leche', quantity: 1, unitPrice: 2.5 });
  });

  it('switches to edit mode when an item is tapped', async () => {
    mockGetLists.mockResolvedValue([list([item('i1', 'Arroz', 2, 3, 'Mercado')])]);
    renderShopping();
    fireEvent.press(await screen.findByText('Arroz'));
    expect(screen.getByText('Editando producto')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
    expect(screen.getByDisplayValue('Arroz')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Cancelar edición'));
    expect(screen.queryByText('Editando producto')).toBeNull();
  });

  it('shows an error state and retries', async () => {
    mockGetLists.mockRejectedValue(new Error('boom'));
    renderShopping();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    const before = mockGetLists.mock.calls.length;
    mockGetLists.mockResolvedValue([list([item('i1', 'Arroz', 1, 3, 'Mercado')])]);
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(mockGetLists.mock.calls.length).toBeGreaterThan(before));
    expect(await screen.findByText('Arroz')).toBeTruthy();
  });
});
