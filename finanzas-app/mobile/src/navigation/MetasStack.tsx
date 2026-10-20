import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MetasStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import MetasScreen from '../screens/MetasScreen';
import GoalFormScreen from '../screens/GoalFormScreen';

const Stack = createNativeStackNavigator<MetasStackParamList>();

export default function MetasStack() {
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
      {/* MetasScreen ya renderiza su propio header — sin header nativo */}
      <Stack.Screen name="MetasList" component={MetasScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="GoalForm"
        component={GoalFormScreen}
        options={({ route }) => ({
          presentation: 'modal',
          headerShown: true,
          headerTitle: route.params?.goalId ? 'Editar meta' : 'Nueva meta de ahorro',
        })}
      />
    </Stack.Navigator>
  );
}
