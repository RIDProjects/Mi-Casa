import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    addExpense: jest.fn(),
    addIncome: jest.fn(),
    updateIncome: jest.fn(),
    syncFiGoal: jest.fn(),
  },
}));

const currencies = [{ code: 'CUP', symbol: '₱' }, { code: 'USD', symbol: 'US$' }, { code: 'EUR', symbol: '€' }];

const makeBudget = (overrides: any = {}) => ({
  id: 'b1',
  name: 'Mi Presupuesto 2026',
  year: 2026,
  savingsTargetPercent: 20,
  rule: '50-30-20',
  incomeSources: [
    { id: 'i1', name: 'Remesa', type: 'extras', amount: 100, currencyCode: 'USD' },
    { id: 'i2', name: 'Sueldo', type: 'salary', amount: 5000, currencyCode: null },
  ],
  categories: [{
    id: 'c1', name: 'Casa', isDefault: false, expenses: [
      { id: 'e1', name: 'Alquiler', amount: 10, periodicity: 'monthly', isFixed: true, isCreditCard: false, isAntExpense: false, currencyCode: 'USD' },
      { id: 'e2', name: 'Luz', amount: 1000, periodicity: 'monthly', isFixed: false, isCreditCard: false, isAntExpense: false, currencyCode: null },
      { id: 'e3', name: 'Viaje', amount: 50, periodicity: 'monthly', isFixed: false, isCreditCard: false, isAntExpense: false, currencyCode: 'EUR' },
    ],
  }],
  currencies,
  localCurrency: 'CUP',
  rates: { CUP: 1, USD: 120, EUR: null },
  summary: {
    totalMonthlyIncome: 17000, totalMonthlyExpenses: 2200, available: 14800, savingsTargetAmount: 0,
    antExpensesTotal: 0, advisory: 'ok', missingRates: ['EUR'],
    alerts: { overBudget: false, nearLimit: false, savingsShortfall: 0, antExpensesWarning: false },
    plan: null,
  },
  ...overrides,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PresupuestoPage />
    </QueryClientProvider>,
  );
}

const mockBudget = (budget: any) => {
  (budgetAPI.getAll as jest.Mock).mockResolvedValue({ data: [budget] });
  (budgetAPI.getOne as jest.Mock).mockResolvedValue({ data: budget });
};

describe('PresupuestoPage multi-currency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (budgetAPI.addExpense as jest.Mock).mockResolvedValue({ data: {} });
    (budgetAPI.addIncome as jest.Mock).mockResolvedValue({ data: {} });
    (budgetAPI.updateIncome as jest.Mock).mockResolvedValue({ data: {} });
    (budgetAPI.updateExpense as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('shows each line in its own currency and local lines with the local symbol', async () => {
    mockBudget(makeBudget());
    renderPage();
    expect(await screen.findByRole('button', { name: /editar monto de alquiler/i })).toHaveTextContent('US$10');
    expect(screen.getByRole('button', { name: /editar monto de luz/i })).toHaveTextContent('₱1000');
    expect(screen.getByRole('button', { name: /editar monto de viaje/i })).toHaveTextContent('€50');
  });

  it('converts category total to local and leaves out lines without a rate', async () => {
    mockBudget(makeBudget());
    renderPage();
    await screen.findByRole('button', { name: /editar monto de luz/i });
    // 10 USD * 120 + 1000 local; the EUR line has no rate
    expect(screen.getByText('₱2200/mes')).toBeInTheDocument();
  });

  it('warns about currencies without exchange rate', async () => {
    mockBudget(makeBudget());
    renderPage();
    expect(await screen.findByText('Sin tasa de cambio para EUR: esas líneas no se suman a los totales.')).toBeInTheDocument();
  });

  it('does not warn nor show currency pickers with a single currency', async () => {
    mockBudget(makeBudget({
      currencies: [currencies[0]], rates: { CUP: 1 },
      summary: { ...makeBudget().summary, missingRates: [] },
      incomeSources: [], categories: [{ id: 'c1', name: 'Casa', isDefault: false, expenses: [] }],
    }));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /gasto/i }));
    expect(screen.queryByLabelText('Moneda')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sin tasa de cambio/)).not.toBeInTheDocument();
  });

  it('adds an expense with the chosen currency, defaulting to the local one', async () => {
    mockBudget(makeBudget());
    renderPage();
    await screen.findByText('Casa');
    await userEvent.click(screen.getAllByRole('button', { name: 'Gasto' }).find(b => b.querySelector('.lucide-plus'))!);
    const select = screen.getByLabelText('Moneda') as HTMLSelectElement;
    expect(select.value).toBe('CUP');
    await userEvent.type(screen.getByPlaceholderText(/Netflix/), 'Spotify');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '5');
    await userEvent.selectOptions(select, 'USD');
    await userEvent.click(within(select.closest('form') as HTMLElement).getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(budgetAPI.addExpense).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'Spotify', amount: 5, currencyCode: 'USD' })));
  });

  it('prefills the currency when editing an income and sends it on save', async () => {
    mockBudget(makeBudget());
    renderPage();
    await screen.findByText('Remesa');
    const row = screen.getByText('Remesa').closest('tr') as HTMLElement;
    await userEvent.click(within(row).getAllByRole('button')[0]);
    const select = screen.getByLabelText('Moneda') as HTMLSelectElement;
    expect(select.value).toBe('USD');
    await userEvent.selectOptions(select, 'EUR');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar ingreso' }));
    await waitFor(() => expect(budgetAPI.updateIncome).toHaveBeenCalledWith('i1', expect.objectContaining({ currencyCode: 'EUR' })));
  });

  it('changes the currency of an expense inline', async () => {
    mockBudget(makeBudget());
    renderPage();
    await userEvent.selectOptions(await screen.findByLabelText('Moneda de Luz'), 'USD');
    await waitFor(() => expect(budgetAPI.updateExpense).toHaveBeenCalledWith('e2', { currencyCode: 'USD' }));
  });
});
