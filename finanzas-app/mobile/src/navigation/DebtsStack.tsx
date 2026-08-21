import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DebtsStackParamList } from './types';
import { Colors } from '../theme/colors';
import DebtsSummaryScreen from '../screens/debts/DebtsSummaryScreen';
import AddDebtScreen from '../screens/debts/AddDebtScreen';

const Stack = createNativeStackNavigator<DebtsStackParamList>();

export default function DebtsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.card },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      {/* DebtsSummaryScreen ya renderiza su propio header — sin header nativo */}
      <Stack.Screen
        name="DebtsSummary"
        component={DebtsSummaryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddDebt"
        component={AddDebtScreen}
        options={{
          presentation: 'modal',
          headerShown: true,
          headerTitle: 'Registrar Deuda',
        }}
      />
    </Stack.Navigator>
  );
}
