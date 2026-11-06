import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import PresupuestoPage from '../pages/presupuesto';
import { budgetAPI } from '../services/api';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../services/api', () => ({
  budgetAPI: { getAll: jest.fn(), getOne: jest.fn(), update: jest.fn(), updateExpense: jest.fn(), syncFiGoal: jest.fn() },
}));

const autoDebtLines = [
  { source: 'loan', id: 'l1', label: 'Hipoteca - Banco A', monthlyAmount: 400, balance: 20000, estimated: false, interestRate: 0 },
  { source: 'card', id: 'k1', label: 'Visa Gold', monthlyAmount: 100, balance: 2000, estimated: true, interestRate: 30 },
];

const budget = {
  id: 'b1', name: 'Mi Presupuesto 2026', year: 2026, savingsTargetPercent: 20, rule: '50-30-20',
  incomeSources: [],
  categories: [
    { id: 'c1', name: 'Casa', isDefault: false, expenses: [] },
    { id: 'c2', name: 'Deudas', isDefault: true, expenses: [
      { id: 'e1', name: 'Pago a Pedro', amount: 50, periodicity: 'monthly', isFixed: false, isCreditCard: false, isAntExpense: false },
    ] },
  ],
  autoDebtLines,
  summary: {
    totalMonthlyIncome: 0, totalMonthlyExpenses: 550, available: 0, savingsTargetAmount: 0, antExpensesTotal: 0, advisory: 'ok',
    alerts: { overBudget: false, nearLimit: false, savingsShortfall: 0, antExpensesWarning: false }, plan: null,
  },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PresupuestoPage /></QueryClientProvider>);
}

describe('PresupuestoPage automatic debt lines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (budgetAPI.getAll as jest.Mock).mockResolvedValue({ data: [budget] });
    (budgetAPI.getOne as jest.Mock).mockResolvedValue({ data: budget });
  });

  it('lists the automatic lines read-only inside the Deudas category, next to the manual ones', async () => {
    renderPage();

    const row = (await screen.findByText('Hipoteca - Banco A')).closest('tr') as HTMLElement;
    expect(within(row).getByText('Automático')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.getByText('Visa Gold')).toBeInTheDocument();
    expect(screen.getByText('Pago a Pedro')).toBeInTheDocument();
  });

  it('adds the automatic lines to the category total', async () => {
    renderPage();

    // 50 manual + 400 + 100 automatic
    expect(await screen.findByText(/\$550,00\/mes/)).toBeInTheDocument();
  });

  it('marks estimated lines', async () => {
    renderPage();

    const row = (await screen.findByText('Visa Gold')).closest('tr') as HTMLElement;
    expect(within(row).getByText(/estimado/i)).toBeInTheDocument();
  });
});
