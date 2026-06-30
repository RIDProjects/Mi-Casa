import { NavigatorScreenParams } from '@react-navigation/native';

// Stack raíz (sobre los tabs — para modales)
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AddDebt: { debtId?: string; debtType?: 'they_owe_me' | 'i_owe' } | undefined;
};

// Bottom tabs
export type MainTabParamList = {
  Debts: undefined;
  Expenses: NavigatorScreenParams<GastosStackParamList>;
};

// Stack anidado dentro del tab de Gastos
export type GastosStackParamList = {
  ShoppingList: undefined;
  ExpenseRegistry: undefined;
};
