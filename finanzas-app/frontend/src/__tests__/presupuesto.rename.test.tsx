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
    syncFiGoal: jest.fn(),
  },
}));

const budget = {
  id: 'b1',
  name: 'Mi Presupuesto 2026',
  year: 2026,
  savingsTargetPercent: 20,
  rule: '50-30-20',
  incomeSources: [],
  categories: [],
  summary: {
    totalMonthlyIncome: 0, totalMonthlyExpenses: 0, available: 0, savingsTargetAmount: 0,
    antExpensesTotal: 0, advisory: 'ok',
    alerts: { overBudget: false, nearLimit: false, savingsShortfall: 0, antExpensesWarning: false },
    plan: null,
  },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PresupuestoPage />
    </QueryClientProvider>,
  );
}

describe('PresupuestoPage rename', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // behave like the server: later reads return what was last saved
    let current = budget;
    (budgetAPI.getAll as jest.Mock).mockImplementation(async () => ({ data: [current] }));
    (budgetAPI.getOne as jest.Mock).mockImplementation(async () => ({ data: current }));
    (budgetAPI.update as jest.Mock).mockImplementation(async (_id, patch) => {
      current = { ...current, ...patch };
      return { data: current };
    });
  });

  it('lets the user rename the budget and shows the new name', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar nombre/i }));
    const input = await screen.findByLabelText('Nombre del presupuesto');
    await userEvent.clear(input);
    await userEvent.type(input, 'Hogar 2026');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(budgetAPI.update).toHaveBeenCalledWith('b1', { name: 'Hogar 2026' }));
    expect(await screen.findByRole('heading', { name: 'Hogar 2026' })).toBeInTheDocument();
  });

  it('does not call the API for an empty name', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar nombre/i }));
    const input = await screen.findByLabelText('Nombre del presupuesto');
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(budgetAPI.update).not.toHaveBeenCalled();
  });
});
