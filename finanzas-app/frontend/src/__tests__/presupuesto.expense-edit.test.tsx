import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import PresupuestoPage from '../pages/presupuesto';
import { budgetAPI } from '../services/api';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../services/api', () => ({
  budgetAPI: {
    getAll: jest.fn(),
    getOne: jest.fn(),
    update: jest.fn(),
    updateExpense: jest.fn(),
    syncFiGoal: jest.fn(),
  },
}));

const makeBudget = (expense: any) => ({
  id: 'b1',
  name: 'Mi Presupuesto 2026',
  year: 2026,
  savingsTargetPercent: 20,
  rule: '50-30-20',
  incomeSources: [],
  categories: [{ id: 'c1', name: 'Casa', isDefault: false, expenses: [expense] }],
  summary: {
    totalMonthlyIncome: 0, totalMonthlyExpenses: 0, available: 0, savingsTargetAmount: 0,
    antExpensesTotal: 0, advisory: 'ok',
    alerts: { overBudget: false, nearLimit: false, savingsShortfall: 0, antExpensesWarning: false },
    plan: null,
  },
});

const expense = {
  id: 'e1', name: 'Netflix', amount: 100, periodicity: 'monthly',
  isFixed: false, isCreditCard: false, isAntExpense: false,
};

let lastClient: QueryClient;
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  lastClient = client;
  return render(
    <QueryClientProvider client={client}>
      <PresupuestoPage />
    </QueryClientProvider>,
  );
}

describe('PresupuestoPage expense inline edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    let current = makeBudget(expense);
    (budgetAPI.getAll as jest.Mock).mockImplementation(async () => ({ data: [current] }));
    (budgetAPI.getOne as jest.Mock).mockImplementation(async () => ({ data: current }));
    (budgetAPI.updateExpense as jest.Mock).mockImplementation(async (_id, patch) => {
      current = makeBudget({ ...expense, ...patch });
      return { data: patch };
    });
  });

  it('edits the amount and saves it on Enter', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar monto de netflix/i }));
    const input = screen.getByLabelText('Monto de Netflix');
    await userEvent.clear(input);
    await userEvent.type(input, '150{Enter}');

    await waitFor(() => expect(budgetAPI.updateExpense).toHaveBeenCalledWith('e1', { amount: 150 }));
    expect(await screen.findByRole('button', { name: /editar monto de netflix/i })).toHaveTextContent('150');
  });

  it('edits the name and saves it on blur', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar nombre de netflix/i }));
    const input = screen.getByLabelText('Nombre de Netflix');
    await userEvent.clear(input);
    await userEvent.type(input, 'Spotify');
    await userEvent.tab();

    await waitFor(() => expect(budgetAPI.updateExpense).toHaveBeenCalledWith('e1', { name: 'Spotify' }));
  });

  it('cancels with Escape without calling the API', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar monto de netflix/i }));
    const input = screen.getByLabelText('Monto de Netflix');
    await userEvent.clear(input);
    await userEvent.type(input, '999{Escape}');

    expect(budgetAPI.updateExpense).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /editar monto de netflix/i })).toHaveTextContent('100');
  });

  it('does not call the API for an unchanged, empty or negative value', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar monto de netflix/i }));
    await userEvent.type(screen.getByLabelText('Monto de Netflix'), '{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /editar monto de netflix/i }));
    const input = screen.getByLabelText('Monto de Netflix');
    await userEvent.clear(input);
    await userEvent.type(input, '{Enter}');
    expect(budgetAPI.updateExpense).not.toHaveBeenCalled();
  });

  it('refreshes the modules derived from the budget after an edit', async () => {
    renderPage();
    const spy = jest.spyOn(lastClient, 'invalidateQueries');
    await userEvent.click(await screen.findByRole('button', { name: /editar monto de netflix/i }));
    const input = screen.getByLabelText('Monto de Netflix');
    await userEvent.clear(input);
    await userEvent.type(input, '150{Enter}');

    await waitFor(() => {
      const keys = spy.mock.calls.map(c => c[0]);
      expect(keys).toEqual(expect.arrayContaining(['emergencyFunds', 'emergencyFundCoverage', 'savings-goals', 'purchaseLists']));
    });
  });
});
