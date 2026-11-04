import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import EmergencyFundPage from '../pages/emergency-fund';
import { emergencyFundAPI } from '../services/api';

jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../store/auth.store', () => ({
  useAuthStore: () => ({ hasPermission: () => true }),
}));
jest.mock('../services/api', () => ({
  emergencyFundAPI: { getAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  emergencyFundCoverageAPI: { getCoverage: jest.fn().mockResolvedValue({ data: null }) },
}));

const fund = (over: any = {}) => ({
  id: 'f1', name: 'Mi Fondo', targetMonths: 6, minimumMonths: 3, savingPeriodMonths: 24, currentBalance: 0,
  syncWithBudget: false, budgetSynced: false,
  categories: [{ name: 'Luz', monthlyAmount: 50 }],
  calculations: { totalMonthlyExpenses: 50, optimalFund: 300, minimumFund: 150, monthlySavingsRequired: 6, monthsToOptimal: 50 },
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><EmergencyFundPage /></QueryClientProvider>);
}

describe('EmergencyFundPage budget sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (emergencyFundAPI.update as jest.Mock).mockResolvedValue({ data: fund() });
    (emergencyFundAPI.create as jest.Mock).mockResolvedValue({ data: fund() });
  });

  it('sends syncWithBudget when the user turns the toggle on while editing', async () => {
    (emergencyFundAPI.getAll as jest.Mock).mockResolvedValue({ data: [fund()] });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /editar/i }));
    const toggle = screen.getByLabelText(/sincronizar con el presupuesto/i);
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => expect(emergencyFundAPI.update).toHaveBeenCalledWith(
      'f1', expect.objectContaining({ syncWithBudget: true }),
    ));
  });

  it('offers to sync a manual fund with one click and changes nothing else', async () => {
    (emergencyFundAPI.getAll as jest.Mock).mockResolvedValue({ data: [fund()] });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /sincronizar con el presupuesto/i }));
    await waitFor(() => expect(emergencyFundAPI.update).toHaveBeenCalledWith('f1', { syncWithBudget: true }));
  });

  it('does not offer the sync on a fund that is already synced', async () => {
    (emergencyFundAPI.getAll as jest.Mock).mockResolvedValue({ data: [fund({ syncWithBudget: true, budgetSynced: true })] });
    renderPage();
    await screen.findByText(/Sincronizado con el presupuesto/i);
    expect(screen.queryByRole('button', { name: /sincronizar con el presupuesto/i })).toBeNull();
  });

  it('makes the categories read-only and shows a badge while synced', async () => {
    (emergencyFundAPI.getAll as jest.Mock).mockResolvedValue({
      data: [fund({ syncWithBudget: true, budgetSynced: true })],
    });
    renderPage();
    expect(await screen.findByText(/sincronizado con el presupuesto/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByLabelText(/sincronizar con el presupuesto/i)).toBeChecked();
    expect(screen.getByPlaceholderText('Categoría')).toBeDisabled();
    expect(screen.getByLabelText(/meses óptimo/i)).toBeDisabled();
    expect(screen.queryByRole('button', { name: /\+ agregar/i })).not.toBeInTheDocument();
  });
});
