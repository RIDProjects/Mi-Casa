import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BudgetStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import BudgetScreen from '../screens/BudgetScreen';
import CategoryDetailScreen from '../screens/budget/CategoryDetailScreen';
import IncomeSourcesScreen from '../screens/budget/IncomeSourcesScreen';

const Stack = createNativeStackNavigator<BudgetStackParamList>();

export default function BudgetStack() {
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
      {/* BudgetScreen ya renderiza su propio header — sin header nativo */}
      <Stack.Screen name="BudgetHome" component={BudgetScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} options={{ headerTitle: 'Categoría' }} />
      <Stack.Screen name="IncomeSources" component={IncomeSourcesScreen} options={{ headerTitle: 'Ingresos' }} />
    </Stack.Navigator>
  );
}
