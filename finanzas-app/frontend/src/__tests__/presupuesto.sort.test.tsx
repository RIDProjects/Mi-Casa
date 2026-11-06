import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import PresupuestoPage from '../pages/presupuesto';
import { budgetAPI } from '../services/api';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('../components/layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));
jest.mock('../services/api', () => ({
  budgetAPI: { getAll: jest.fn(), getOne: jest.fn(), update: jest.fn(), updateExpense: jest.fn(), syncFiGoal: jest.fn() },
}));

const exp = (id: string, name: string, amount: number, periodicity = 'monthly') => ({
  id, name, amount, periodicity, isFixed: false, isCreditCard: false, isAntExpense: false,
});

const budget = {
  id: 'b1', name: 'Mi Presupuesto 2026', year: 2026, savingsTargetPercent: 20, rule: '50-30-20',
  incomeSources: [
    { id: 'i1', name: 'Freelance', type: 'freelance', amount: 200 },
    { id: 'i2', name: 'Salario', type: 'salary', amount: 1500 },
  ],
  categories: [{ id: 'c1', name: 'Casa', isDefault: false, expenses: [exp('e1', 'Netflix', 15), exp('e2', 'Alquiler', 400), exp('e3', 'Agua', 40)] }],
  summary: {
    totalMonthlyIncome: 1700, totalMonthlyExpenses: 455, available: 1245, savingsTargetAmount: 340, antExpensesTotal: 0, advisory: 'ok',
    alerts: { overBudget: false, nearLimit: false, savingsShortfall: 0, antExpensesWarning: false }, plan: null,
  },
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PresupuestoPage /></QueryClientProvider>);
};

const firstCells = (table: HTMLElement) =>
  Array.from(table.querySelectorAll('tbody tr')).map(tr => tr.querySelector('td')?.textContent);

describe('PresupuestoPage sortable tables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (budgetAPI.getAll as jest.Mock).mockResolvedValue({ data: [budget] });
    (budgetAPI.getOne as jest.Mock).mockResolvedValue({ data: budget });
  });

  it('lists expenses from the biggest monthly amount down by default', async () => {
    renderPage();
    const header = await screen.findByRole('columnheader', { name: /gasto/i });
    const table = header.closest('table') as HTMLElement;
    expect(firstCells(table).map(t => t?.replace(/\s+/g, ' ').trim())).toEqual(['Alquiler', 'Agua', 'Netflix']);
    expect(within(table).getByRole('columnheader', { name: /mensual/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts expenses by name when the column header is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    const header = await screen.findByRole('columnheader', { name: /gasto/i });
    const table = header.closest('table') as HTMLElement;
    await user.click(within(header).getByRole('button'));
    expect(firstCells(table).map(t => t?.replace(/\s+/g, ' ').trim())).toEqual(['Agua', 'Alquiler', 'Netflix']);
  });

  it('lists income sources from the biggest down by default', async () => {
    renderPage();
    const header = await screen.findByRole('columnheader', { name: /fuente/i });
    const table = header.closest('table') as HTMLElement;
    expect(firstCells(table).map(t => t?.replace(/\s+/g, ' ').trim())).toEqual(['Salario', 'Freelance']);
  });
});
