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

import AddDebtScreen from '../debts/AddDebtScreen';
import { debtsService } from '../../services/debts.service';

const mockGoBack = jest.fn();
let mockParams: any = undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../services/debts.service', () => ({
  debtsService: { create: jest.fn(), update: jest.fn() },
}));

const svc = debtsService as jest.Mocked<typeof debtsService>;

const renderScreen = (existing?: any) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (existing) client.setQueryData(['debts'], [existing]);
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AddDebtScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('AddDebtScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = undefined;
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('renders the form with the default type', () => {
    renderScreen();
    expect(screen.getByText('Nombre de la persona')).toBeTruthy();
    expect(screen.getByText('Monto')).toBeTruthy();
    expect(screen.getByText('Nota (opcional)')).toBeTruthy();
    expect(screen.getByText('Alguien te debe dinero a ti')).toBeTruthy();
    expect(screen.getByText('Registrar deuda')).toBeTruthy();
  });

  it('switches the type chips and the hint', () => {
    renderScreen();
    fireEvent.press(screen.getByText('LES DEBO'));
    expect(screen.getByText('Tú le debes dinero a alguien')).toBeTruthy();
  });

  it('rejects an empty name without calling the mutation', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Registrar deuda'));
    expect(alert).toHaveBeenCalledWith('Falta el nombre', 'Ingresa el nombre de la persona.');
    expect(svc.create).not.toHaveBeenCalled();
  });

  it.each([[''], ['0'], ['-5'], ['abc']])('rejects the invalid amount %p', (amount) => {
    renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Juan, Papá, Empresa X...'), 'Juan');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), amount);
    fireEvent.press(screen.getByText('Registrar deuda'));
    expect(alert).toHaveBeenCalledWith('Monto inválido', 'Ingresa un monto mayor a cero.');
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('creates the debt with a trimmed payload (comma decimals) and goes back', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fireEvent.press(screen.getByText('LES DEBO'));
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Juan, Papá, Empresa X...'), '  Ana ');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '12,5');
    fireEvent.changeText(screen.getByPlaceholderText('Descripción adicional...'), '  cena ');
    fireEvent.press(screen.getByText('Registrar deuda'));
    await waitFor(() =>
      expect(svc.create).toHaveBeenCalledWith({ personName: 'Ana', amount: 12.5, note: 'cena', type: 'i_owe' }),
    );
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
  });

  it('pre-fills and updates an existing debt when editing', async () => {
    mockParams = { debtId: 'd1' };
    svc.update.mockResolvedValue({} as any);
    renderScreen({ id: 'd1', personName: 'Juan', amount: 100, type: 'they_owe_me', note: 'x', isPaid: false });
    expect(screen.getByDisplayValue('Juan')).toBeTruthy();
    expect(screen.getByDisplayValue('100')).toBeTruthy();
    fireEvent.changeText(screen.getByDisplayValue('100'), '80');
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith('d1', { personName: 'Juan', amount: 80, note: 'x', type: 'they_owe_me' }),
    );
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('shows the server error message when saving fails', async () => {
    svc.create.mockRejectedValue({ response: { data: { message: ['uno', 'dos'] } } });
    renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Ej: Juan, Papá, Empresa X...'), 'Ana');
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '5');
    fireEvent.press(screen.getByText('Registrar deuda'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'uno, dos'));
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('cancel goes back', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Cancelar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
