import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DebtsStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import DebtsSummaryScreen from '../screens/debts/DebtsSummaryScreen';
import AddDebtScreen from '../screens/debts/AddDebtScreen';

const Stack = createNativeStackNavigator<DebtsStackParamList>();

/** Stack of the "Deudas" tab. The summary keeps its own large title in the body. */
export default function DebtsStack() {
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
      <Stack.Screen name="DebtsSummary" component={DebtsSummaryScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AddDebt"
        component={AddDebtScreen}
        options={({ route }) => ({
          presentation: 'modal',
          headerShown: true,
          headerTitle: route.params?.debtId ? 'Editar Deuda' : 'Registrar Deuda',
        })}
      />
    </Stack.Navigator>
  );
}
