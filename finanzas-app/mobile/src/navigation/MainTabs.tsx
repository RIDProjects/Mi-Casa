import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from './types';
import { Colors } from '../theme/colors';
import DashboardScreen from '../screens/DashboardScreen';
import GastosStack from './GastosStack';
import BudgetScreen from '../screens/BudgetScreen';
import MetasScreen from '../screens/MetasScreen';
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const name = route.name as TabName;
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.card,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            paddingBottom: 4,
            height: 62,
          },
          tabBarActiveTintColor: Colors.blue,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
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
      <Tab.Screen name="Presupuesto" component={BudgetScreen} />
      <Tab.Screen name="Metas" component={MetasScreen} />
      <Tab.Screen name="Deudas" component={DebtsStack} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
