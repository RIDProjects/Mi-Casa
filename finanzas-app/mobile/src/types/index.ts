// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

// ─── Debts ───────────────────────────────────────────────────────────────────

export type DebtType = 'they_owe_me' | 'i_owe';

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  note?: string;
  type: DebtType;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DebtsSummary {
  totalTheyOweMe: number;
  totalIOwe: number;
  balance: number;
}

export interface CreateDebtDto {
  personName: string;
  amount: number;
  note?: string;
  type: DebtType;
}

export interface UpdateDebtDto {
  personName?: string;
  amount?: number;
  note?: string;
  type?: DebtType;
  isPaid?: boolean;
}

// ─── Transactions ────────────────────────────────────────────────────────────

export type TransactionType = 'gasto' | 'ingreso_fijo' | 'ingreso_variable';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta';
export type TransactionCategory =
  | 'Comida'
  | 'Transporte'
  | 'Hogar'
  | 'Salud'
  | 'Ocio'
  | 'Salidas'
  | 'Shopper'
  | 'Otros';

export const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  'Comida',
  'Transporte',
  'Hogar',
  'Salud',
  'Ocio',
  'Salidas',
  'Shopper',
  'Otros',
];

export interface Transaction {
  id: string;
  tipo: TransactionType;
  concepto: string;
  categoria: TransactionCategory;
  monto: number;
  metodoPago: PaymentMethod;
  fecha: string;
  createdAt: string;
}

export interface CreateTransactionDto {
  tipo: TransactionType;
  concepto: string;
  categoria: TransactionCategory;
  monto: number;
  metodoPago: PaymentMethod;
  fecha: string;
}

// ─── Shopping List (estado local, no persiste en API) ────────────────────────

export interface ShoppingItem {
  id: string;
  producto: string;
  cantidad: number;
  precioCUP: number;
  tienda: string;
}

// ─── Aggregations ────────────────────────────────────────────────────────────

export interface CategoryTotal {
  category: TransactionCategory;
  total: number;
  percentage: number;
}
