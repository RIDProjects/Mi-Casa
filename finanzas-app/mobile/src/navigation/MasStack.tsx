import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MasStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import MasScreen from '../screens/MasScreen';
import DebtsSummaryScreen from '../screens/debts/DebtsSummaryScreen';
import AddDebtScreen from '../screens/debts/AddDebtScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<MasStackParamList>();

/**
 * Stack of the "Más" tab: the hub plus the screens that used to be tabs (Deudas, Perfil).
 * The native header only provides the back arrow there (empty title): both screens keep
 * their own large title in the body.
 */
export default function MasStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.panel },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontFamily: fonts.title, fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="MasHome" component={MasScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DebtsSummary" component={DebtsSummaryScreen} options={{ headerTitle: '' }} />
      <Stack.Screen
        name="AddDebt"
        component={AddDebtScreen}
        options={({ route }) => ({
          presentation: 'modal',
          headerTitle: route.params?.debtId ? 'Editar Deuda' : 'Registrar Deuda',
        })}
      />
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ headerTitle: '' }} />
    </Stack.Navigator>
  );
}
