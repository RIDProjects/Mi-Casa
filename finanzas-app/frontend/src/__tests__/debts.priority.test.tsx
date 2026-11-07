import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import DebtsPage from '../pages/debts';
import { debtsAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('../components/layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));
jest.mock('../services/api', () => ({
  debtsAPI: { getAll: jest.fn(), getSummary: jest.fn(), getOffset: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));

const debts = [
  { id: 'o1', personName: 'Luis', amount: '200.00', type: 'they_owe_me', priority: 'media', isPaid: false, interestRate: '0', note: '', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'a', personName: 'Alba', amount: '100.00', type: 'i_owe', priority: 'alta', isPaid: false, interestRate: '0', note: '', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'b', personName: 'Beto', amount: '150.00', type: 'i_owe', priority: 'media', isPaid: false, interestRate: '0', note: '', createdAt: '2026-01-02T00:00:00Z' },
  { id: 'c', personName: 'Cata', amount: '80.00', type: 'i_owe', priority: 'baja', isPaid: false, interestRate: '0', note: '', createdAt: '2026-01-03T00:00:00Z' },
];

const offset = {
  owedToMe: 200,
  items: [
    { id: 'a', label: 'Alba', priority: 'alta', amount: 100, covered: 100, pending: 0, status: 'cubierta' },
    { id: 'b', label: 'Beto', priority: 'media', amount: 150, covered: 100, pending: 50, status: 'parcial' },
    { id: 'c', label: 'Cata', priority: 'baja', amount: 80, covered: 0, pending: 80, status: 'pendiente' },
  ],
  totalCovered: 200,
  totalPending: 130,
  remainingPool: 0,
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><DebtsPage /></QueryClientProvider>);
};

describe('DebtsPage priority and offset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ hasPermission: () => true } as any);
    (debtsAPI.getAll as jest.Mock).mockResolvedValue({ data: debts });
    (debtsAPI.getSummary as jest.Mock).mockResolvedValue({ data: { totalTheyOweMe: 200, totalIOwe: 330, balance: -130 } });
    (debtsAPI.getOffset as jest.Mock).mockResolvedValue({ data: offset });
    (debtsAPI.create as jest.Mock).mockResolvedValue({ data: {} });
  });

  it('shows each debt with its priority and how much of it is covered', async () => {
    renderPage();

    const alba = (await screen.findByText('Alba')).closest('tr') as HTMLElement;
    expect(within(alba).getByText('Alta')).toBeInTheDocument();
    expect(within(alba).getByText('Cubierta')).toBeInTheDocument();
    const beto = screen.getByText('Beto').closest('tr') as HTMLElement;
    expect(within(beto).getByText('Media')).toBeInTheDocument();
    expect(within(beto).getByText('Parcial')).toBeInTheDocument();
    const cata = screen.getByText('Cata').closest('tr') as HTMLElement;
    expect(within(cata).getByText('Baja')).toBeInTheDocument();
    expect(within(cata).getByText('Pendiente')).toBeInTheDocument();
  });

  it('lists the debts I owe by priority, highest first', async () => {
    renderPage();

    const alba = (await screen.findByText('Alba')).closest('tr') as HTMLElement;
    const table = alba.closest('table') as HTMLElement;
    const names = Array.from(table.querySelectorAll('tbody tr')).map(tr => tr.querySelector('td')?.textContent?.replace(/\s+/g, ' ').trim());
    expect(names.slice(0, 3)).toEqual(['Alba', 'Beto', 'Cata']);
  });

  it('summarizes the offset: what is owed to me and what is left for the budget', async () => {
    renderPage();

    const panel = await screen.findByRole('region', { name: /cobertura con lo que te deben/i });
    expect(within(panel).getByText('Pasa al presupuesto')).toBeInTheDocument();
    expect(panel.textContent).toMatch(/130/);
    expect(panel.textContent).toMatch(/200/);
  });

  it('asks for the priority of a debt I owe and sends it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Alba');

    await user.click(screen.getAllByRole('button', { name: /agregar|nueva|registrar/i })[0]);
    await user.click(await screen.findByRole('button', { name: /yo debo/i }));
    await user.type(screen.getByPlaceholderText(/nombre/i), 'Dani');
    const priority = screen.getByLabelText(/prioridad/i);
    expect(priority).toHaveValue('media');
    await user.selectOptions(priority, 'alta');
    await user.type(screen.getAllByRole('spinbutton')[0], '90');
    await user.click(screen.getByRole('button', { name: /^guardar|registrar$/i }));

    await waitFor(() => expect(debtsAPI.create).toHaveBeenCalledWith(expect.objectContaining({ personName: 'Dani', type: 'i_owe', priority: 'alta' })));
  });
});
