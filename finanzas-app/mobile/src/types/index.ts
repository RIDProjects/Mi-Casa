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
  precio: number;
  tienda: string;
}

// ─── Household Expenses (Registro de Gastos, CUP) ─────────────────────────────
// Backend: Controller('household-expenses'). House resuelta server-side.

export type HouseholdCategory = TransactionCategory;

export interface HouseholdExpense {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: HouseholdCategory;
  montoCUP: number;
  lugar: string | null;
  mes: string;
  createdAt: string;
}

export interface CreateHouseholdExpenseDto {
  fecha: string;
  descripcion: string;
  categoria?: HouseholdCategory;
  montoCUP: number;
  lugar?: string;
  mes: string;
}

// Fila agregada de compras del mercado (derivada de la Lista de Compras, sin id propio)
export interface HouseholdComprasPorLugar {
  fecha: string;
  descripcion: string;
  categoria: string;
  lugar: string;
  totalCUP: number;
}

export interface HouseholdResumenCategoria {
  categoria: string;
  totalCUP: number;
}

export interface HouseholdExpensesMonth {
  month: string;
  comprasMercado: HouseholdComprasPorLugar[];
  salidas: HouseholdExpense[];
  resumenCategoria: HouseholdResumenCategoria[];
  totalCompras: number;
  totalSalidas: number;
  total: number;
}

// ─── Purchases (Lista de la Compra) ────────────────────────────────────────────
// Backend: Controller('purchases'). Modelo de dos niveles: lista mensual -> items.

export type PurchaseStatus = 'pending' | 'purchased' | 'cancelled';

export interface PurchaseItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: string | null;
  lugar: string | null;
  status: PurchaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseListSummary {
  total: number;
  budget: number;
  remaining: number | null;
  status: string;
  purchased: number;
  pending: number;
  count: number;
}

export interface PurchaseList {
  id: string;
  name: string;
  description: string | null;
  budget: number;
  baseCurrencyCode: string | null;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
  summary?: PurchaseListSummary;
}

export interface CreatePurchaseListDto {
  name: string;
  description?: string;
  budget?: number;
  baseCurrencyCode?: string;
}

export interface CreatePurchaseItemDto {
  name: string;
  quantity?: number;
  unitPrice?: number;
  currency?: string;
  lugar?: string;
  status?: PurchaseStatus;
}

// ─── Aggregations ────────────────────────────────────────────────────────────

export interface CategoryTotal {
  category: TransactionCategory;
  total: number;
  percentage: number;
}

// ─── Dashboard Summary ───────────────────────────────────────────────────────

export interface MonthlySummary {
  month: number;
  year: number;
  totalIngresos: number;
  totalGastos: number;
  balance: number;
  emergencyFund?: number;
  savingsRate?: number;
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export type Periodicity =
  | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly'
  | 'quarterly' | 'fourmonthly' | 'semiannual' | 'annual';

export interface BudgetExpense {
  id: string;
  name: string;
  amount: number;
  periodicity: Periodicity;
  isFixed: boolean;
  isCreditCard: boolean;
  isAntExpense: boolean;
}

export interface BudgetIncomeSource {
  id: string;
  name: string;
  type: string;
  amount: number;
}

export interface BudgetCategory {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  expenses: BudgetExpense[];
}

export interface BudgetPlan {
  rule: '50-30-20' | '70-20-10';
  fiTarget: number;
  minMonthlyInvestment: number;
  emergencyFundTarget: number;
  entertainmentBudget: number;
  fixedExpensesCap: number;
}

export interface BudgetSummary {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  available: number;
  savingsTargetAmount: number;
  antExpensesTotal: number;
  advisory: 'ok' | 'warning' | 'danger';
  alerts: {
    overBudget: boolean;
    nearLimit: boolean;
    savingsShortfall: number;
    antExpensesWarning: boolean;
  };
  plan: BudgetPlan | null;
}

export interface Budget {
  id: string;
  name: string;
  year: number | null;
  savingsTargetPercent: number;
  rule: '50-30-20' | '70-20-10';
  incomeSources: BudgetIncomeSource[];
  categories: BudgetCategory[];
  summary: BudgetSummary;
}

// ─── Savings Goals ───────────────────────────────────────────────────────────

// Backend (savings-goals.service.ts `toFrontend`) returns Spanish field
// names — this is the actual response contract, not request-body-only.
export interface SavingsGoal {
  id: string;
  nombre: string;
  montoMeta: number;
  ahorrosActuales: number;
  mesesParaAhorrarla: number;
  tasaInteres: number;
  emoji?: string;
  createdAt: string;
  updatedAt: string;
  monthlyContribution: number;
  progress: number;
}

// ─── Upcoming Bills ──────────────────────────────────────────────────────────

export interface UpcomingBill {
  type: string;
  name: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

// ─── Notifications (in-app) ─────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  message: string;
  title: string | null;
  body: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Credit Cards ────────────────────────────────────────────────────────────

export type CardPaymentType = 'full' | 'minimum' | 'stopped' | 'partial';

// Backend (credit-cards.service.ts `toFrontend`) returns Spanish field
// names — this is the actual response contract, not request-body-only.
export interface CreditCard {
  id: string;
  banco: string;
  nombreTarjeta: string;
  tasaAnual: number;
  saldoActual: number;
  lineaCredito: number;
  fechaCorte: string | null;
  fechaPago: string | null;
  tipoPago: CardPaymentType;
  createdAt: string;
  updatedAt: string;
  utilizationPercent: number;
  advisory: string;
}

// ─── Cuotas ──────────────────────────────────────────────────────────────────

export interface Cuota {
  id: string;
  description: string;
  totalAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  installmentAmount: number;
  store: string | null;
  cardLast4: string | null;
  startDate: string;
  withInterest: boolean;
  interestRate: number;
  createdAt: string;
  updatedAt: string;
}
