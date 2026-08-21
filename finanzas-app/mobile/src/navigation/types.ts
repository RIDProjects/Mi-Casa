import { NavigatorScreenParams } from '@react-navigation/native';

// Stack raíz (sobre los tabs — para modales y pantallas secundarias)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Vencimientos: undefined;
  Notificaciones: undefined;
  PrivacyPolicy: undefined;
};

// Bottom tabs (6 tabs: Dashboard, Gastos, Presupuesto, Metas, Deudas, Perfil)
export type MainTabParamList = {
  Dashboard: undefined;
  Expenses: NavigatorScreenParams<GastosStackParamList>;
  Presupuesto: undefined;
  Metas: undefined;
  Deudas: NavigatorScreenParams<DebtsStackParamList>;
  Perfil: undefined;
};

// Stack anidado dentro del tab de Gastos
export type GastosStackParamList = {
  ShoppingList: undefined;
  ExpenseRegistry: undefined;
};

// Stack anidado dentro del tab de Deudas
export type DebtsStackParamList = {
  DebtsSummary: undefined;
  AddDebt: { debtId?: string; debtType?: 'they_owe_me' | 'i_owe' } | undefined;
};
