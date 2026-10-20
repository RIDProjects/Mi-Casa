import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import MasScreen, { MAS_GROUPS } from '../MasScreen';
import { ThemeProvider } from '../../theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Ana Pérez' } }) }));

const renderHub = () => render(<ThemeProvider><MasScreen /></ThemeProvider>);

describe('MasScreen', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('greets the signed-in user and lists every group', () => {
    renderHub();
    expect(screen.getByText('Sesión de Ana Pérez')).toBeTruthy();
    for (const group of MAS_GROUPS) expect(screen.getByText(group.title)).toBeTruthy();
  });

  it.each([
    ['Movimientos', 'Movimientos'],
    ['Deudas', 'DebtsSummary'],
    ['Tarjetas de crédito', 'Tarjetas'],
    ['Cuotas', 'Cuotas'],
    ['Fondo de emergencia', 'FondoEmergencia'],
    ['Patrimonio', 'Patrimonio'],
    ['Vencimientos', 'Vencimientos'],
    ['Perfil y ajustes', 'Perfil'],
  ])('opens %s', (label, route) => {
    renderHub();
    fireEvent.press(screen.getByLabelText(label));
    expect(mockNavigate).toHaveBeenCalledWith(route);
  });

  it('exposes exactly the eight destinations', () => {
    expect(MAS_GROUPS.flatMap((g) => g.entries).length).toBe(8);
  });
});
