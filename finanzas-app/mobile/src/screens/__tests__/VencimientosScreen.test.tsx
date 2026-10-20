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

import VencimientosScreen from '../VencimientosScreen';
import { summaryService } from '../../services/summary.service';

jest.mock('../../services/summary.service', () => ({ summaryService: { getUpcomingBills: jest.fn() } }));

const getBills = summaryService.getUpcomingBills as jest.Mock;

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <VencimientosScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('VencimientosScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    getBills.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('vencimientos-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    getBills.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    getBills.mockResolvedValue([{ type: 'loan', name: 'Préstamo', amount: 10, dueDate: '2026-10-25', daysUntilDue: 5 }]);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Préstamo')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    getBills.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Sin vencimientos próximos')).toBeTruthy();
  });

  it('lists the bills with amount and days until due', async () => {
    getBills.mockResolvedValue([
      { type: 'credit_card', name: 'Visa', amount: 250, dueDate: '2026-10-20', daysUntilDue: 0 },
      { type: 'loan', name: 'Préstamo', amount: 1200.5, dueDate: '2026-10-25', daysUntilDue: 5 },
      { type: 'cuota', name: 'Laptop', amount: 80, dueDate: '2026-11-10', daysUntilDue: 21 },
    ]);
    renderScreen();
    expect(await screen.findByText('Visa')).toBeTruthy();
    expect(screen.getByText('US$ 250.00')).toBeTruthy();
    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(screen.getByText('US$ 1,200.50')).toBeTruthy();
    expect(screen.getByText('5 días')).toBeTruthy();
    expect(screen.getByText('Laptop')).toBeTruthy();
    expect(screen.getByText('21 días')).toBeTruthy();
  });
});
