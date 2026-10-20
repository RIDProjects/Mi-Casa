import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { darkColors, lightColors } from '../tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function Probe() {
  const { colors, isDark, mode, toggle, setMode } = useTheme();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="dark">{String(isDark)}</Text>
      <Text testID="surface">{colors.surface}</Text>
      <Text testID="toggle" onPress={toggle}>toggle</Text>
      <Text testID="light" onPress={() => setMode('light')}>light</Text>
    </>
  );
}

describe('ThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts in dark mode with the Pro-Ledger night surface', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('dark').props.children).toBe('true');
    expect(screen.getByTestId('surface').props.children).toBe(darkColors.surface);
  });

  it('toggles to light and persists the choice', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.press(screen.getByTestId('toggle'));
    expect(screen.getByTestId('mode').props.children).toBe('light');
    expect(screen.getByTestId('surface').props.children).toBe(lightColors.surface);
    await waitFor(async () => expect(await AsyncStorage.getItem('theme-mode')).toBe('light'));
  });

  it('restores the saved mode on launch', async () => {
    await AsyncStorage.setItem('theme-mode', 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('light'));
  });

  it('ignores an invalid saved value', async () => {
    await AsyncStorage.setItem('theme-mode', 'purple');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByTestId('mode').props.children).toBe('dark');
  });
});
