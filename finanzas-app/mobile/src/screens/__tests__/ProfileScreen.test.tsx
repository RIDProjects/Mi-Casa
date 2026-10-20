import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ProfileScreen from '../ProfileScreen';
import { ThemeProvider } from '../../theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../services/account.service', () => ({ accountService: { deleteAccount: jest.fn() } }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 7, name: 'Ana Pérez', email: 'ana@example.com', roles: [{ name: 'user' }] },
    logout: jest.fn(),
  }),
}));

const renderProfile = () =>
  render(
    <ThemeProvider>
      <ProfileScreen />
    </ThemeProvider>,
  );

describe('ProfileScreen', () => {
  it('shows the account info and highlights the current theme mode', () => {
    renderProfile();
    expect(screen.getAllByText('ana@example.com').length).toBe(2);
    expect(screen.getByLabelText('Oscuro').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Claro').props.accessibilityState.selected).toBe(false);
  });

  it('switches the theme mode when an option is pressed', () => {
    renderProfile();
    fireEvent.press(screen.getByLabelText('Claro'));
    expect(screen.getByLabelText('Claro').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Oscuro').props.accessibilityState.selected).toBe(false);
  });

  it('opens the delete-account modal asking for the password', () => {
    renderProfile();
    fireEvent.press(screen.getByText('Eliminar cuenta'));
    expect(screen.getByPlaceholderText('Tu contraseña')).toBeTruthy();
    fireEvent.press(screen.getByText('Eliminar'));
    expect(screen.getByText('Ingresa tu contraseña para confirmar.')).toBeTruthy();
  });
});
