import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ThemeProvider } from './src/theme/ThemeContext';
import { useAppFonts } from './src/theme/useAppFonts';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initSentry } from './src/config/sentry';

// No-op si EXPO_PUBLIC_SENTRY_DSN no está seteada.
initSentry();

// QueryClient con configuración sensata para mobile:
// - staleTime 0 para siempre refetch al volver a una pantalla
// - retry 2 para no bloquear al usuario en caso de error de red
// - sin refetchInterval global: cada pantalla con datos "vivos" sondea cada 10 s solo mientras
//   está enfocada (hooks/useScreenPolling). Con tabs que quedan montadas, un intervalo global
//   mantendría todas las pestañas visitadas consultando en segundo plano. React Query pausa el
//   polling con la app en background y retoma al volver.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

// React Query no escucha AppState por su cuenta en React Native — sin esto,
// volver del background nunca revalida queries aunque refetchOnWindowFocus
// esté en true, y el usuario tiene que refrescar a mano para ver datos nuevos.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

export default function App() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  // Wait briefly for the fonts (avoids a flash of system text); useAppFonts never blocks forever.
  if (!fontsReady) return null;

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={styles.flex}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppNavigator />
            </AuthProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
