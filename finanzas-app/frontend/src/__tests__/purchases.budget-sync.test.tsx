import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import PurchasesPage from '../pages/purchases';
import { purchasesAPI } from '../services/api';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('../store/auth.store', () => ({
  useAuthStore: () => ({ hasPermission: () => true }),
}));
jest.mock('../services/api', () => ({
  purchasesAPI: { getLists: jest.fn(), createList: jest.fn(), updateList: jest.fn() },
}));

const now = new Date();
const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const list = (over: any = {}) => ({
  id: 'l1', name: monthStr, description: null, budget: 100, localCurrencyCode: null,
  budgetSynced: false, items: [],
  summary: { total: 0, budget: 100, remaining: 100, status: 'ok', purchased: 0, pending: 0, count: 0 },
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PurchasesPage /></QueryClientProvider>);
}

describe('PurchasesPage budget from the budget module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has no manual month configuration and shows the budget it receives', async () => {
    (purchasesAPI.getLists as jest.Mock).mockResolvedValue({
      data: [list({ budgetSynced: true, budget: 433.33 })],
    });
    renderPage();
    expect(await screen.findByText('Presupuesto del mes')).toBeInTheDocument();
    expect(screen.getAllByText(/433/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /configurar mes/i })).not.toBeInTheDocument();
  });

  it('points to the budget when the list has no budget yet', async () => {
    (purchasesAPI.getLists as jest.Mock).mockResolvedValue({ data: [list({ budget: 0 })] });
    renderPage();
    expect(await screen.findByText(/presupuesto compra/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /configurar mes/i })).not.toBeInTheDocument();
  });
});
