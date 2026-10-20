import React from 'react';
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
jest.mock('../../services/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

const mockGet = apiClient.get as jest.Mock;

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

const renderMetas = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
});
