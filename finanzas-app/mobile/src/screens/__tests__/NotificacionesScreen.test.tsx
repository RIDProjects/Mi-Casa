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

import NotificacionesScreen from '../NotificacionesScreen';
import { notificationsService } from '../../services/notifications.service';

jest.mock('../../services/notifications.service', () => ({
  notificationsService: { getAll: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() },
}));

const svc = notificationsService as jest.Mocked<typeof notificationsService>;

const note = (over: any = {}) => ({
  id: 'n1', message: 'Mensaje', title: 'Título', body: 'Cuerpo', type: 'info', isRead: false, createdAt: '2026-10-19T10:00:00Z', ...over,
});

const renderScreen = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <NotificacionesScreen />
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('NotificacionesScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the skeleton while loading', () => {
    svc.getAll.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    expect(screen.getByTestId('notificaciones-skeleton')).toBeTruthy();
  });

  it('shows the error state and retries', async () => {
    svc.getAll.mockRejectedValue(new Error('boom'));
    renderScreen();
    expect(await screen.findByText('Algo salió mal', {}, { timeout: 4000 })).toBeTruthy();
    svc.getAll.mockResolvedValue([note()]);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Título')).toBeTruthy();
  });

  it('shows the empty state', async () => {
    svc.getAll.mockResolvedValue([]);
    renderScreen();
    expect(await screen.findByText('Sin notificaciones')).toBeTruthy();
    expect(screen.queryByText(/Marcar todas/)).toBeNull();
  });

  it('falls back to the default title and the message when title/body are missing', async () => {
    svc.getAll.mockResolvedValue([note({ title: null, body: null, message: 'Solo mensaje', isRead: true })]);
    renderScreen();
    expect(await screen.findByText('Notificación')).toBeTruthy();
    expect(screen.getByText('Solo mensaje')).toBeTruthy();
  });

  it('marks a single unread notification as read when pressed', async () => {
    svc.getAll.mockResolvedValue([note()]);
    svc.markRead.mockResolvedValue(note({ isRead: true }) as any);
    renderScreen();
    fireEvent.press(await screen.findByText('Título'));
    await waitFor(() => expect(svc.markRead).toHaveBeenCalledWith('n1'));
  });

  it('does not call markRead for an already read notification', async () => {
    svc.getAll.mockResolvedValue([note({ isRead: true })]);
    renderScreen();
    fireEvent.press(await screen.findByText('Título'));
    expect(svc.markRead).not.toHaveBeenCalled();
  });

  it('shows the unread count and marks all as read', async () => {
    svc.getAll.mockResolvedValue([note({ id: 'a' }), note({ id: 'b', title: 'Otra' }), note({ id: 'c', isRead: true, title: 'Leída' })]);
    svc.markAllRead.mockResolvedValue(undefined);
    renderScreen();
    fireEvent.press(await screen.findByText('Marcar todas como leídas (2)'));
    await waitFor(() => expect(svc.markAllRead).toHaveBeenCalledTimes(1));
  });

  it('alerts when marking as read fails', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    svc.getAll.mockResolvedValue([note()]);
    svc.markRead.mockRejectedValue(new Error('x'));
    renderScreen();
    fireEvent.press(await screen.findByText('Título'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'No se pudo marcar como leída'));
    alert.mockRestore();
  });
});
