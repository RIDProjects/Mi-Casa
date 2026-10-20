import { NavigatorScreenParams } from '@react-navigation/native';
import type { Transaction } from '../types';

// Stack raíz (sobre los tabs — para modales y pantallas secundarias)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Vencimientos: undefined;
  Notificaciones: undefined;
  Movimientos: undefined;
  MovimientoForm: { transaction?: Transaction } | undefined;
  PrivacyPolicy: undefined;
};

// Bottom tabs (6 tabs: Dashboard, Gastos, Presupuesto, Metas, Deudas, Perfil)
export type MainTabParamList = {
  Dashboard: undefined;
  Expenses: NavigatorScreenParams<GastosStackParamList>;
  Presupuesto: undefined;
  Metas: NavigatorScreenParams<MetasStackParamList>;
  Deudas: NavigatorScreenParams<DebtsStackParamList>;
  Perfil: undefined;
};

// Stack anidado dentro del tab de Gastos
export type GastosStackParamList = {
  ShoppingList: undefined;
  ExpenseRegistry: undefined;
  AddHouseholdExpense: { expenseId?: string } | undefined;
};

// Stack anidado dentro del tab de Deudas
export type DebtsStackParamList = {
  DebtsSummary: undefined;
  AddDebt: { debtId?: string; debtType?: 'they_owe_me' | 'i_owe' } | undefined;
};

// Stack anidado dentro del tab de Metas
export type MetasStackParamList = {
  MetasList: undefined;
  GoalForm: { goalId?: string } | undefined;
};
