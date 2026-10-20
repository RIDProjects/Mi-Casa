import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MetasScreen from '../MetasScreen';
import { ThemeProvider } from '../../theme/ThemeContext';
import apiClient from '../../services/apiClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));

const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;

const goal = (over: any = {}) => ({
  id: 'g1',
  nombre: 'Viaje',
  montoMeta: 1000,
  ahorrosActuales: 250,
  mesesParaAhorrarla: 6,
  tasaInteres: 0,
  createdAt: '',
  updatedAt: '',
  monthlyContribution: 100,
  progress: 25,
  ...over,
});

let client: QueryClient;
const renderMetas = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(client, 'invalidateQueries');
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MetasScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('MetasScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    mockGet.mockImplementation(() => new Promise(() => {}));
    renderMetas();
    expect(screen.getByTestId('metas-skeleton')).toBeTruthy();
  });

  it('shows the summary, ring and goal cards', async () => {
    mockGet.mockResolvedValue({
      data: [
        goal({ emoji: '✈️' }),
        goal({ id: 'g2', nombre: 'Laptop', montoMeta: 500, ahorrosActuales: 500, mesesParaAhorrarla: 1, progress: 100 }),
      ],
    });
    renderMetas();
    expect(await screen.findByText('✈️ Viaje')).toBeTruthy();
    expect(screen.getByText('6 meses para lograrla')).toBeTruthy();
    expect(screen.getByText('1 mes para lograrla')).toBeTruthy();
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('US$ 750.00')).toBeTruthy();
    expect(screen.getByText('50.0% del objetivo total: US$ 1,500.00')).toBeTruthy();
    expect(screen.getByText('Meta alcanzada')).toBeTruthy();
    expect(screen.getByText('Metas activas')).toBeTruthy();
    expect(screen.getByText('Completadas')).toBeTruthy();
  });

  it('shows the empty state without goals', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderMetas();
    expect(await screen.findByText('Sin metas registradas')).toBeTruthy();
    expect(screen.getByText('Usa el botón de abajo para crear tu primera meta de ahorro')).toBeTruthy();
    expect(screen.queryByText('Total ahorrado')).toBeNull();
  });

  it('shows an error state and retries', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    renderMetas();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    const before = mockGet.mock.calls.length;
    mockGet.mockResolvedValue({ data: [goal()] });
    fireEvent.press(screen.getByText('Reintentar'));
    await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThan(before));
    expect(await screen.findByText('Viaje')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });

  it('opens the create form from the action bar, also with no goals', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderMetas();
    await screen.findByText('Sin metas registradas');
    fireEvent.press(screen.getByText('Nueva meta'));
    expect(mockNavigate).toHaveBeenCalledWith('GoalForm', {});
  });

  it('opens the edit form when a goal card is tapped', async () => {
    mockGet.mockResolvedValue({ data: [goal()] });
    renderMetas();
    fireEvent.press(await screen.findByText('Viaje'));
    expect(mockNavigate).toHaveBeenCalledWith('GoalForm', { goalId: 'g1' });
  });

  describe('contribution', () => {
    let alert: jest.SpyInstance;
    beforeEach(() => {
      alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      mockGet.mockResolvedValue({ data: [goal()] });
    });
    afterEach(() => alert.mockRestore());

    const openPrompt = async () => {
      renderMetas();
      await screen.findByText('Viaje');
      fireEvent.press(screen.getByText('Aportar'));
    };

    it('adds the amount to ahorrosActuales, invalidates and closes', async () => {
      mockPut.mockResolvedValue({ data: {} });
      await openPrompt();
      fireEvent.changeText(screen.getByLabelText('Monto del aporte'), '50,5');
      fireEvent.press(screen.getByText('Guardar aporte'));
      await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/savings-goals/g1', { ahorrosActuales: 300.5 }));
      await waitFor(() => expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['savings-goals'] }));
      expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['summary'] });
      await waitFor(() => expect(screen.queryByLabelText('Monto del aporte')).toBeNull());
    });

    it.each([[''], ['0'], ['-5'], ['abc']])('rejects the amount %p without calling the API', async (amount) => {
      await openPrompt();
      fireEvent.changeText(screen.getByLabelText('Monto del aporte'), amount);
      fireEvent.press(screen.getByText('Guardar aporte'));
      expect(screen.getByText('Ingresa un monto mayor a cero.')).toBeTruthy();
      expect(mockPut).not.toHaveBeenCalled();
    });

    it('shows an alert on a server error and keeps the prompt open', async () => {
      mockPut.mockRejectedValue({ response: { data: { message: 'falló' } } });
      await openPrompt();
      fireEvent.changeText(screen.getByLabelText('Monto del aporte'), '10');
      fireEvent.press(screen.getByText('Guardar aporte'));
      await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'falló'));
      expect(screen.getByLabelText('Monto del aporte')).toBeTruthy();
    });

    it('closes the prompt on cancel without calling the API', async () => {
      await openPrompt();
      fireEvent.press(screen.getByText('Cancelar'));
      await waitFor(() => expect(screen.queryByLabelText('Monto del aporte')).toBeNull());
      expect(mockPut).not.toHaveBeenCalled();
    });
  });
});
