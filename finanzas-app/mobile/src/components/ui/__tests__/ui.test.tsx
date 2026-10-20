import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ActionBar, Button, EmptyState, ErrorState, PageHeader, ProgressRing, StatCard, TextField } from '..';
import { ThemeProvider } from '../../../theme/ThemeContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Button', () => {
  it('calls onPress', () => {
    const onPress = jest.fn();
    wrap(<Button label="Guardar" onPress={onPress} />);
    fireEvent.press(screen.getByText('Guardar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading or disabled', () => {
    const onPress = jest.fn();
    const { rerender } = wrap(<Button label="Guardar" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button'));
    rerender(<ThemeProvider><Button label="Guardar" onPress={onPress} disabled /></ThemeProvider>);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('shows the error message and label', () => {
    wrap(<TextField label="Email" error="Email inválido" value="" onChangeText={() => undefined} />);
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Email inválido')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    wrap(<TextField label="Contraseña" passwordToggle secureTextEntry value="x" onChangeText={() => undefined} placeholder="pw" />);
    expect(screen.getByPlaceholderText('pw').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByLabelText('Mostrar contraseña'));
    expect(screen.getByPlaceholderText('pw').props.secureTextEntry).toBe(false);
  });
});

describe('EmptyState / ErrorState', () => {
  it('renders the title and runs the action', () => {
    const onAction = jest.fn();
    wrap(<EmptyState title="Sin datos" subtitle="Nada aún" actionLabel="Crear" onAction={onAction} />);
    expect(screen.getByText('Sin datos')).toBeTruthy();
    fireEvent.press(screen.getByText('Crear'));
    expect(onAction).toHaveBeenCalled();
  });

  it('offers retry only when a handler is given', () => {
    const { rerender } = wrap(<ErrorState />);
    expect(screen.queryByText('Reintentar')).toBeNull();
    const onRetry = jest.fn();
    rerender(<ThemeProvider><ErrorState onRetry={onRetry} /></ThemeProvider>);
    fireEvent.press(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('StatCard', () => {
  it('shows title, value and subtitle', () => {
    wrap(<StatCard title="Gastos" value="$580" icon="cart-outline" tone="warn" subtitle="de $1000" />);
    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByText('$580')).toBeTruthy();
    expect(screen.getByText('de $1000')).toBeTruthy();
  });
});

describe('ProgressRing', () => {
  const rotations = () =>
    screen.UNSAFE_getAllByType(View)
      .map((n) => StyleSheet.flatten(n.props.style)?.transform?.[0]?.rotate)
      .filter(Boolean);

  it('rotates only the right half for the first 50 %', () => {
    wrap(<ProgressRing value={0.25} />);
    expect(rotations()).toEqual(['-45deg']);
  });

  it('fills the right half and rotates the left one past 50 %', () => {
    wrap(<ProgressRing value={0.75} />);
    expect(rotations()).toEqual(['45deg', '-45deg']);
  });

  it('clamps NaN to empty and values above 1 to full', () => {
    wrap(<ProgressRing value={NaN} />);
    expect(rotations()).toEqual([]);
    screen.unmount();
    wrap(<ProgressRing value={5} />);
    expect(rotations()).toEqual(['45deg', '45deg']);
  });

  it('renders its children', () => {
    wrap(<ProgressRing value={0.5}><Text>50%</Text></ProgressRing>);
    expect(screen.getByText('50%')).toBeTruthy();
  });
});

describe('ActionBar', () => {
  it('shows the label and runs the action', () => {
    const onPress = jest.fn();
    wrap(<ActionBar label="Registrar gasto" onPress={onPress} />);
    fireEvent.press(screen.getByText('Registrar gasto'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('TextField multiline', () => {
  const fieldStyle = () => {
    const input = screen.getByPlaceholderText('nota');
    // TextInput > field row (the bordered container)
    return StyleSheet.flatten(input.parent?.parent?.props.style);
  };

  it('aligns a multiline field to the top so the icon does not float in the middle', () => {
    wrap(<TextField icon="create-outline" multiline placeholder="nota" value="" onChangeText={() => undefined} />);
    expect(fieldStyle().alignItems).toBe('flex-start');
  });

  it('keeps a single-line field centred', () => {
    wrap(<TextField icon="mail-outline" placeholder="nota" value="" onChangeText={() => undefined} />);
    expect(fieldStyle().alignItems).toBe('center');
  });
});

describe('PageHeader', () => {
  it('lets a long title wrap onto two lines instead of truncating it', () => {
    wrap(<PageHeader title="Servicios y suscripciones del hogar" />);
    expect(screen.getByText('Servicios y suscripciones del hogar').props.numberOfLines).toBe(2);
  });
});
