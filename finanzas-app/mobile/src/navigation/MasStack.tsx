import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MasStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import MasScreen from '../screens/MasScreen';
import MetasScreen from '../screens/MetasScreen';
import GoalFormScreen from '../screens/GoalFormScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<MasStackParamList>();

/**
 * Stack of the "Más" tab: the hub plus Metas and Perfil.
 * The native header only provides the back arrow there (empty title): the screens keep
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
      {/* MetasScreen ya renderiza su propio header */}
      <Stack.Screen name="MetasList" component={MetasScreen} options={{ headerTitle: '' }} />
      <Stack.Screen
        name="GoalForm"
        component={GoalFormScreen}
        options={({ route }) => ({
          presentation: 'modal',
          headerTitle: route.params?.goalId ? 'Editar meta' : 'Nueva meta de ahorro',
        })}
      />
      <Stack.Screen name="Perfil" component={ProfileScreen} options={{ headerTitle: '' }} />
    </Stack.Navigator>
  );
}
