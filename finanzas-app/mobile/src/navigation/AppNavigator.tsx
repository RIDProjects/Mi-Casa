import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import type { ThemeColors } from '../theme/tokens';
import { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import VencimientosScreen from '../screens/VencimientosScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';
import MovimientosScreen from '../screens/MovimientosScreen';
import TarjetasScreen from '../screens/TarjetasScreen';
import TarjetaFormScreen from '../screens/TarjetaFormScreen';
import CuotasScreen from '../screens/CuotasScreen';
import CuotaFormScreen from '../screens/CuotaFormScreen';
import MovimientoFormScreen from '../screens/MovimientoFormScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const buildNavTheme = (c: ThemeColors, isDark: boolean) => ({
  ...DefaultTheme,
  dark: isDark,
  colors: {
    ...DefaultTheme.colors,
    background: c.surface,
    card: c.panel,
    text: c.onSurface,
    border: c.border,
    notification: c.brand,
    primary: c.brand,
  },
});

const headerOptions = (c: ThemeColors, title: string) => ({
  headerShown: true,
  headerTitle: title,
  headerStyle: { backgroundColor: c.panel },
  headerTintColor: c.onSurface,
  headerTitleStyle: { fontFamily: fonts.title, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: c.surface },
});

function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.splash, { backgroundColor: colors.surface }]}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const navTheme = buildNavTheme(colors, isDark);

  if (isLoading) {
    return (
      <NavigationContainer theme={navTheme}>
        <SplashScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.surface },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Vencimientos"
            component={VencimientosScreen}
            options={headerOptions(colors, 'Próximos vencimientos')}
          />
          <Stack.Screen
            name="Notificaciones"
            component={NotificacionesScreen}
            options={headerOptions(colors, 'Notificaciones')}
          />
          <Stack.Screen
            name="Movimientos"
            component={MovimientosScreen}
            options={headerOptions(colors, 'Movimientos')}
          />
          <Stack.Screen
            name="MovimientoForm"
            component={MovimientoFormScreen}
            options={({ route }) =>
              headerOptions(colors, route.params?.transaction ? 'Editar movimiento' : 'Registrar movimiento')
            }
          />
          <Stack.Screen
            name="Tarjetas"
            component={TarjetasScreen}
            options={headerOptions(colors, 'Tarjetas de crédito')}
          />
          <Stack.Screen
            name="TarjetaForm"
            component={TarjetaFormScreen}
            options={({ route }) =>
              headerOptions(colors, route.params?.card ? 'Editar tarjeta' : 'Nueva tarjeta')
            }
          />
          <Stack.Screen
            name="Cuotas"
            component={CuotasScreen}
            options={headerOptions(colors, 'Plan de cuotas')}
          />
          <Stack.Screen
            name="CuotaForm"
            component={CuotaFormScreen}
            options={({ route }) =>
              headerOptions(colors, route.params?.cuota ? 'Editar cuota' : 'Nueva cuota')
            }
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={headerOptions(colors, 'Política de Privacidad')}
          />
        </Stack.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
