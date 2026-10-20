import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GastosStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import ShoppingListScreen from '../screens/expenses/ShoppingListScreen';
import ExpenseRegistryScreen from '../screens/expenses/ExpenseRegistryScreen';
import AddHouseholdExpenseScreen from '../screens/expenses/AddHouseholdExpenseScreen';

const Stack = createNativeStackNavigator<GastosStackParamList>();

export default function GastosStack() {
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
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: 'Lista de Compras' }}
      />
      <Stack.Screen
        name="ExpenseRegistry"
        component={ExpenseRegistryScreen}
        options={{ title: 'Gastos del Mes' }}
      />
      <Stack.Screen
        name="AddHouseholdExpense"
        component={AddHouseholdExpenseScreen}
        options={({ route }) => ({
          presentation: 'modal',
          title: route.params?.expenseId ? 'Editar Gasto' : 'Registrar Gasto',
        })}
      />
    </Stack.Navigator>
  );
}
