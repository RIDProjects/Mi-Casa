import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import DashboardScreen from '../screens/DashboardScreen';
import GastosStack from './GastosStack';
import BudgetStack from './BudgetStack';
import MetasStack from './MetasStack';
import DebtsStack from './DebtsStack';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabName = keyof MainTabParamList;

const ICONS: Record<TabName, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  Dashboard:   { outline: 'home-outline',      filled: 'home' },
  Expenses:    { outline: 'cart-outline',       filled: 'cart' },
  Presupuesto: { outline: 'pie-chart-outline',  filled: 'pie-chart' },
  Metas:       { outline: 'trophy-outline',     filled: 'trophy' },
  Deudas:      { outline: 'people-outline',     filled: 'people' },
  Perfil:      { outline: 'person-outline',     filled: 'person' },
};

const TAB_LABELS: Record<TabName, string> = {
  Dashboard:   'Inicio',
  Expenses:    'Gastos',
  Presupuesto: 'Presupuesto',
  Metas:       'Metas',
  Deudas:      'Deudas',
  Perfil:      'Perfil',
};

export default function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const name = route.name as TabName;
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.panel,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 62,
          },
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.outline,
          tabBarLabelStyle: {
            fontFamily: fonts.semibold,
            fontSize: 10,
            marginBottom: 4,
          },
          tabBarLabel: TAB_LABELS[name],
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONS[name].filled : ICONS[name].outline}
              size={size}
              color={color}
            />
          ),
        };
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Expenses" component={GastosStack} />
      <Tab.Screen name="Presupuesto" component={BudgetStack} />
      <Tab.Screen name="Metas" component={MetasStack} />
      <Tab.Screen name="Deudas" component={DebtsStack} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
