import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { Button, LedgerBackground } from './ui';

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 12,
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: c.dangerTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    title: { fontFamily: fonts.title, color: c.onSurface, fontSize: 20, textAlign: 'center' },
    message: {
      fontFamily: fonts.regular,
      color: c.onSurfaceVariant,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 12,
    },
  });

// The boundary wraps ThemeProvider, so the context falls back to its default (dark) palette here.
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <LedgerBackground />
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.dangerInk} />
      </View>
      <Text style={styles.title}>Algo salió mal</Text>
      <Text style={styles.message}>
        Ocurrió un error inesperado. Puedes intentar de nuevo; si el problema
        persiste, cierra y vuelve a abrir la app.
      </Text>
      <Button label="Reintentar" icon="refresh-outline" onPress={onRetry} />
    </View>
  );
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Los class components son la única forma soportada por React de capturar
// errores de render (getDerivedStateFromError / componentDidCatch). No hay
// equivalente en hooks todavía.
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Reporta a Sentry si está configurado (init es no-op si falta el DSN).
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack ?? undefined },
      },
    });
  }

  handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
