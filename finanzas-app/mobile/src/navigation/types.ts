import { NavigatorScreenParams } from '@react-navigation/native';

// Stack raíz (sobre los tabs — para modales y pantallas secundarias)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AddDebt: { debtId?: string; debtType?: 'they_owe_me' | 'i_owe' } | undefined;
  DebtsSummary: undefined;
};

// Bottom tabs (5 tabs según especificación)
export type MainTabParamList = {
  Dashboard: undefined;
  Expenses: NavigatorScreenParams<GastosStackParamList>;
  Presupuesto: undefined;
  Metas: undefined;
  Perfil: undefined;
};

// Stack anidado dentro del tab de Gastos
export type GastosStackParamList = {
  ShoppingList: undefined;
  ExpenseRegistry: undefined;
};
