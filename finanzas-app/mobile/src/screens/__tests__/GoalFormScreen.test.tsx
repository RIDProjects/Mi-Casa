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

import GoalFormScreen from '../GoalFormScreen';
import { savingsService } from '../../services/savings.service';

const mockGoBack = jest.fn();
let mockParams: any = undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../services/savings.service', () => ({
  savingsService: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
}));

const svc = savingsService as jest.Mocked<typeof savingsService>;

const goal = {
  id: 'g1',
  nombre: 'Viaje',
  montoMeta: 1000,
  ahorrosActuales: 250,
  mesesParaAhorrarla: 6,
  tasaInteres: 4.5,
  emoji: '✈️',
  createdAt: '',
  updatedAt: '',
  monthlyContribution: 100,
  progress: 25,
};

let client: QueryClient;
const renderScreen = (existing?: any) => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (existing) client.setQueryData(['savings-goals'], [existing]);
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <GoalFormScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

const fill = (nombre: string, meta: string, meses: string) => {
  fireEvent.changeText(screen.getByPlaceholderText('Ej: Viaje a Europa'), nombre);
  fireEvent.changeText(screen.getByLabelText('Monto meta'), meta);
  fireEvent.changeText(screen.getByLabelText('Meses para ahorrarla'), meses);
};

describe('GoalFormScreen', () => {
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = undefined;
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alert.mockRestore());

  it('creates a goal with the right payload and invalidates the queries', async () => {
    svc.create.mockResolvedValue({} as any);
    renderScreen();
    fill('  Viaje  ', '1500,50', '12');
    fireEvent.press(screen.getByText('🏠'));
    fireEvent.changeText(screen.getByLabelText('Tasa de interés anual % (opcional)'), '3.5');
    fireEvent.press(screen.getByText('Crear meta'));
    await waitFor(() => expect(svc.create).toHaveBeenCalled());
    expect(svc.create).toHaveBeenCalledWith({
      nombre: 'Viaje',
      emoji: '🏠',
      montoMeta: 1500.5,
      ahorrosActuales: 0,
      mesesParaAhorrarla: 12,
      tasaInteres: 3.5,
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['savings-goals'] });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
  });

  it('pre-fills the form when editing and sends PUT', async () => {
    mockParams = { goalId: 'g1' };
    svc.update.mockResolvedValue({} as any);
    renderScreen(goal);
    expect(screen.getByDisplayValue('Viaje')).toBeTruthy();
    expect(screen.getByDisplayValue('1000')).toBeTruthy();
    expect(screen.getByDisplayValue('250')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
    expect(screen.getByDisplayValue('4.5')).toBeTruthy();
    fireEvent.changeText(screen.getByDisplayValue('Viaje'), 'Viaje a Europa');
    fireEvent.press(screen.getByText('Guardar cambios'));
    await waitFor(() => expect(svc.update).toHaveBeenCalled());
    expect(svc.update).toHaveBeenCalledWith('g1', {
      nombre: 'Viaje a Europa',
      emoji: '✈️',
      montoMeta: 1000,
      ahorrosActuales: 250,
      mesesParaAhorrarla: 6,
      tasaInteres: 4.5,
    });
    await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['savings-goals'] });
  });

  it('shows inline validation errors and does not call the API', () => {
    renderScreen();
    fireEvent.press(screen.getByText('Crear meta'));
    expect(screen.getByText('Ingresa el nombre de la meta.')).toBeTruthy();
    expect(screen.getByText('El monto meta debe ser mayor a cero.')).toBeTruthy();
    expect(screen.getByText('Los meses deben ser un entero mayor o igual a 1.')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it.each([['0'], ['-1'], ['abc']])('rejects montoMeta %p', (meta) => {
    renderScreen();
    fill('Viaje', meta, '6');
    fireEvent.press(screen.getByText('Crear meta'));
    expect(screen.getByText('El monto meta debe ser mayor a cero.')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it.each([['0'], ['1.5'], ['-2']])('rejects meses %p', (meses) => {
    renderScreen();
    fill('Viaje', '100', meses);
    fireEvent.press(screen.getByText('Crear meta'));
    expect(screen.getByText('Los meses deben ser un entero mayor o igual a 1.')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it.each([['101'], ['-1']])('rejects tasa %p', (tasa) => {
    renderScreen();
    fill('Viaje', '100', '6');
    fireEvent.changeText(screen.getByLabelText('Tasa de interés anual % (opcional)'), tasa);
    fireEvent.press(screen.getByText('Crear meta'));
    expect(screen.getByText('La tasa de interés anual debe estar entre 0 y 100 (%)')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('rejects negative current savings', () => {
    renderScreen();
    fill('Viaje', '100', '6');
    fireEvent.changeText(screen.getByLabelText('Ahorros actuales'), '-5');
    fireEvent.press(screen.getByText('Crear meta'));
    expect(screen.getByText('Los ahorros actuales no pueden ser negativos.')).toBeTruthy();
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('shows an alert on a server error and keeps the form', async () => {
    svc.create.mockRejectedValue({ response: { data: { message: ['nombre inválido', 'otro'] } } });
    renderScreen();
    fill('Viaje', '100', '6');
    fireEvent.press(screen.getByText('Crear meta'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'nombre inválido, otro'));
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Viaje')).toBeTruthy();
    expect(screen.getByDisplayValue('100')).toBeTruthy();
  });

  it('does not offer delete when creating', () => {
    renderScreen();
    expect(screen.queryByText('Eliminar meta')).toBeNull();
  });

  describe('delete', () => {
    beforeEach(() => {
      mockParams = { goalId: 'g1' };
    });

    it('asks for confirmation and does not delete until confirmed', () => {
      renderScreen(goal);
      fireEvent.press(screen.getByText('Eliminar meta'));
      expect(alert).toHaveBeenCalledTimes(1);
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('does nothing when the dialog is cancelled', () => {
      renderScreen(goal);
      fireEvent.press(screen.getByText('Eliminar meta'));
      const buttons = alert.mock.calls[0][2];
      const cancel = buttons.find((b: any) => b.text === 'Cancelar');
      cancel.onPress?.();
      expect(svc.remove).not.toHaveBeenCalled();
    });

    it('deletes, invalidates and leaves when confirmed', async () => {
      svc.remove.mockResolvedValue(undefined as any);
      renderScreen(goal);
      fireEvent.press(screen.getByText('Eliminar meta'));
      const buttons = alert.mock.calls[0][2];
      buttons.find((b: any) => b.text === 'Eliminar').onPress();
      await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('g1'));
      await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['savings-goals'] });
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
    });
  });
});
