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
