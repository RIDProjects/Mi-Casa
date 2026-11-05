import { NavigatorScreenParams } from '@react-navigation/native';
import type { CreditCard, Cuota, Transaction } from '../types';

// Stack raíz (sobre los tabs — para modales y pantallas secundarias)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Vencimientos: undefined;
  Notificaciones: undefined;
  Movimientos: undefined;
  MovimientoForm: { transaction?: Transaction } | undefined;
  Tarjetas: undefined;
  TarjetaForm: { card?: CreditCard } | undefined;
  Cuotas: undefined;
  CuotaForm: { cuota?: Cuota } | undefined;
  FondoEmergencia: undefined;
  Patrimonio: undefined;
  PrivacyPolicy: undefined;
};

// Bottom tabs (5 tabs: Inicio, Gastos, Movimientos, Deudas, Más)
export type MainTabParamList = {
  Dashboard: undefined;
  Expenses: NavigatorScreenParams<GastosStackParamList>;
  Movimientos: undefined;
  Deudas: NavigatorScreenParams<DebtsStackParamList>;
  Mas: NavigatorScreenParams<MasStackParamList>;
};

// Stack anidado dentro del tab de Gastos
export type GastosStackParamList = {
  ShoppingList: undefined;
  ExpenseRegistry: undefined;
  AddHouseholdExpense: { expenseId?: string } | undefined;
};

// Stack del tab "Más": hub + Presupuesto + Metas + Perfil
export type MasStackParamList = {
  MasHome: undefined;
  Presupuesto: NavigatorScreenParams<BudgetStackParamList>;
  Perfil: undefined;
} & MetasStackParamList;

// Stack del tab de Deudas
export type DebtsStackParamList = {
  DebtsSummary: undefined;
  AddDebt: { debtId?: string; debtType?: 'they_owe_me' | 'i_owe' } | undefined;
};

// Stack anidado dentro del tab de Presupuesto
export type BudgetStackParamList = {
  BudgetHome: undefined;
  CategoryDetail: { categoryId: string };
  IncomeSources: undefined;
};

// Pantallas de Metas (dentro del stack de Más)
export type MetasStackParamList = {
  MetasList: undefined;
  GoalForm: { goalId?: string } | undefined;
};
