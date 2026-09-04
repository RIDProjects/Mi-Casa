import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initSentry } from './src/config/sentry';

// No-op si EXPO_PUBLIC_SENTRY_DSN no está seteada.
initSentry();

// QueryClient con configuración sensata para mobile:
// - staleTime 0 para siempre refetch al volver a una pantalla
// - retry 2 para no bloquear al usuario en caso de error de red
// - refetchInterval 10s: la web y mobile no comparten ningún mecanismo de
//   tiempo real, así que sin polling un cambio hecho en la web nunca
//   aparece en mobile hasta que el usuario haga algo (background/foreground,
//   pull-to-refresh). El polling pausa solo cuando la app está en background
//   (comportamiento default de React Query) y retoma al volver.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 2,
      refetchOnWindowFocus: true,
      refetchInterval: 10000,
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
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.flex}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
