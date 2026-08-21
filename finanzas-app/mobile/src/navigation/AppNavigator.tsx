import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme/colors';
import { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import VencimientosScreen from '../screens/VencimientosScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.card,
    text: Colors.textPrimary,
    border: Colors.border,
    notification: Colors.blue,
    primary: Colors.blue,
  },
};

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={Colors.blue} />
    </View>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <NavigationContainer theme={DarkTheme}>
        <SplashScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={DarkTheme}>
      {isAuthenticated ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="Vencimientos"
            component={VencimientosScreen}
            options={{
              headerShown: true,
              headerTitle: 'Próximos vencimientos',
              headerStyle: { backgroundColor: Colors.card },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: Colors.background },
            }}
          />
          <Stack.Screen
            name="Notificaciones"
            component={NotificacionesScreen}
            options={{
              headerShown: true,
              headerTitle: 'Notificaciones',
              headerStyle: { backgroundColor: Colors.card },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: Colors.background },
            }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{
              headerShown: true,
              headerTitle: 'Política de Privacidad',
              headerStyle: { backgroundColor: Colors.card },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: Colors.background },
            }}
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
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
