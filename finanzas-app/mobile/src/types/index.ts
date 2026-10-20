// ─── Auth ────────────────────────────────────────────────────────────────────

// Backend (auth.service.ts login/register/getProfile) returns a `roles`
// array of Role entities (each with a `name`), never a singular `role`
// string field — this is the actual response contract.
export interface UserRole {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles?: UserRole[];
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

// Backend (transactions.service.ts `toFrontend`) returns Spanish field names.
// `monto` comes from a decimal column and may arrive as a string; `categoria`
// is one of the web's expense categories (free string, empty for income).
export interface Transaction {
  id: string;
  tipo: TransactionType;
  concepto: string;
  categoria?: string | null;
  monto: number | string;
  metodoPago?: PaymentMethod | null;
  nombreTarjeta?: string | null;
  fecha: string;
  notas?: string | null;
  createdAt?: string;
}

export interface TransactionPayload {
  tipo: TransactionType;
  concepto: string;
  categoria: string;
  monto: number;
  metodoPago: PaymentMethod;
  nombreTarjeta: string;
  fecha: string;
  notas: string;
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
  monto: number;
  moneda: string;
  montoLocal: number;
  tasaCambio: number;
  /** @deprecated Equal to montoLocal. Kept for app builds predating multi-currency support. */
  montoCUP: number;
  lugar: string | null;
  mes: string;
  createdAt: string;
}

export interface CreateHouseholdExpenseDto {
  fecha: string;
  descripcion: string;
  categoria?: HouseholdCategory;
  monto: number;
  moneda: string;
  /** @deprecated Send `monto`/`moneda` instead. Treated as moneda='CUP' by the backend. */
  montoCUP?: number;
  lugar?: string;
  mes: string;
}

// Fila agregada de compras del mercado (derivada de la Lista de Compras, sin id propio)
export interface HouseholdComprasPorLugar {
  fecha: string;
  descripcion: string;
  categoria: string;
  lugar: string;
  /** Converted to the house local currency. Absent on older backends. */
  totalLocal?: number;
  /** @deprecated legacy alias of totalLocal. */
  totalCUP: number;
  unconvertedItems?: number;
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
  /** Market purchase items excluded from totals for lack of an exchange rate. */
  unconvertedItems?: number;
  /** House's local currency code (e.g. 'CUP'). Absent on responses from
   * backend builds predating this change. */
  monedaLocal?: string;
  /** Currencies available for this house's currency picker. */
  monedas?: { code: string; symbol: string }[];
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
  localCurrencyCode: string | null;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
  summary?: PurchaseListSummary;
}

export interface CreatePurchaseListDto {
  name: string;
  description?: string;
  budget?: number;
  localCurrencyCode?: string;
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
  currency?: string;
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

// Body of POST/PUT /credit-cards (CreateCreditCardDto). fechaCorte/fechaPago
// are day-of-month strings.
export interface CreditCardPayload {
  banco: string;
  nombreTarjeta: string;
  tasaAnual: number;
  saldoActual: number;
  lineaCredito: number;
  fechaCorte?: string;
  fechaPago?: string;
  tipoPago: CardPaymentType;
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
  // Computed by the backend (CuotasService.computeFields).
  remainingInstallments?: number;
  remainingAmount?: number;
  nextPaymentDate?: string;
  isCompleted?: boolean;
}

// Body of POST/PUT /cuotas (CreateCuotaDto). The backend reads cardLastFour
// but returns the column as cardLast4.
export interface CuotaPayload {
  description: string;
  store?: string;
  totalAmount: number;
  totalInstallments: number;
  installmentAmount: number;
  startDate: string;
  withInterest: boolean;
  interestRate?: number;
  cardLastFour?: string;
}

// GET /emergency-fund (EmergencyFundService.findAll). Decimal columns can
// arrive as strings.
export interface EmergencyFundCategory {
  id?: string;
  name: string;
  monthlyAmount: number | string;
}

export interface EmergencyFundCalculations {
  totalMonthlyExpenses: number;
  optimalFund: number;
  minimumFund: number;
  monthlySavingsRequired: number;
  monthsToOptimal: number;
}

export interface EmergencyFund {
  id: string;
  name: string;
  targetMonths: number;
  minimumMonths: number;
  savingPeriodMonths: number;
  currentBalance?: number | string | null;
  categories?: EmergencyFundCategory[];
  calculations?: EmergencyFundCalculations;
}

export type EmergencyCoverageStatus = 'safe' | 'low' | 'critical';

// GET /emergency-fund/coverage (balance of the latest fund vs. 3-month average expenses).
export interface EmergencyFundCoverage {
  balance: number;
  monthlyExpenses: number;
  monthsCovered: number;
  targetMonths: number;
  status: EmergencyCoverageStatus;
}

export type NetWorthAssetType = 'physical' | 'cash';

// Asset as returned by GET /net-worth (NetWorthService.toFrontend).
export interface NetWorthAsset {
  id: string;
  nombre: string;
  valorEstimado: number | string;
  assetType: NetWorthAssetType;
  notas?: string | null;
}

// GET /net-worth. totalDebts is whatever the client passed as query params.
export interface NetWorthSummary {
  physicalAssets: number;
  cashAssets: number;
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
  assets: NetWorthAsset[];
}

// A debt counted against the net worth (credit card balance or loan debt).
export interface NetWorthLiability {
  id: string;
  nombre: string;
  monto: number;
  kind: 'card' | 'loan';
}

export interface NetWorthOverview {
  summary: NetWorthSummary;
  liabilities: NetWorthLiability[];
}

// GET /net-worth/history (most recent month first); month is YYYY-MM-DD.
export interface NetWorthHistoryPoint {
  month: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}
