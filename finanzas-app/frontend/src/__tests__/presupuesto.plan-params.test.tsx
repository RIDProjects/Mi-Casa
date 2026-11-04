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
  budgetAPI: { getAll: jest.fn(), getOne: jest.fn(), update: jest.fn(), syncFiGoal: jest.fn() },
}));

const budget = {
  id: 'b1', name: 'Mi Presupuesto 2026', year: 2026, savingsTargetPercent: 20, rule: '50-30-20',
  fiMultiplier: null, minInvestmentPercent: null, emergencyFundMonths: null,
  entertainmentPercent: null, fixedExpensesCapPercent: null,
  incomeSources: [{ id: 'i1', name: 'Sueldo', type: 'salary', amount: 1000 }],
  categories: [],
  summary: {
    totalMonthlyIncome: 1000, totalMonthlyExpenses: 0, available: 1000, savingsTargetAmount: 200,
    antExpensesTotal: 0, advisory: 'ok',
    alerts: { overBudget: false, nearLimit: false, savingsShortfall: 0, antExpensesWarning: false },
    plan: { rule: '50-30-20', fiTarget: 150000, minMonthlyInvestment: 200, emergencyFundTarget: 6000, entertainmentBudget: 300, fixedExpensesCap: 500 },
  },
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PresupuestoPage /></QueryClientProvider>);
}

describe('PresupuestoPage plan parameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (budgetAPI.getAll as jest.Mock).mockResolvedValue({ data: [budget] });
    (budgetAPI.getOne as jest.Mock).mockResolvedValue({ data: budget });
    (budgetAPI.update as jest.Mock).mockResolvedValue({ data: budget });
  });

  const open = async () => userEvent.click(await screen.findByRole('button', { name: /editar parámetros/i }));

  it('prefills the effective values and saves the edited ones', async () => {
    renderPage();
    await open();
    expect(screen.getByLabelText(/Meta FI/)).toHaveValue(150);
    expect(screen.getByLabelText(/Fondo de emergencia/)).toHaveValue(6);
    expect(screen.getByLabelText(/Ocio/)).toHaveValue(30);

    const fi = screen.getByLabelText(/Meta FI/);
    await userEvent.clear(fi);
    await userEvent.type(fi, '100');
    await userEvent.click(screen.getByRole('button', { name: /^guardar/i }));

    await waitFor(() => expect(budgetAPI.update).toHaveBeenCalledWith('b1', {
      fiMultiplier: 100, minInvestmentPercent: 20, emergencyFundMonths: 6,
      entertainmentPercent: 30, fixedExpensesCapPercent: 50,
    }));
  });

  it('restores defaults by sending null for every parameter', async () => {
    renderPage();
    await open();
    await userEvent.click(screen.getByRole('button', { name: /restablecer/i }));
    await waitFor(() => expect(budgetAPI.update).toHaveBeenCalledWith('b1', {
      fiMultiplier: null, minInvestmentPercent: null, emergencyFundMonths: null,
      entertainmentPercent: null, fixedExpensesCapPercent: null,
    }));
  });

  it('does not call the API when a value is empty or negative', async () => {
    renderPage();
    await open();
    const months = screen.getByLabelText(/Fondo de emergencia/);
    await userEvent.clear(months);
    await userEvent.click(screen.getByRole('button', { name: /^guardar/i }));
    expect(budgetAPI.update).not.toHaveBeenCalled();
  });
});
