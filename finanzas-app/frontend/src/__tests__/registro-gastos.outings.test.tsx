import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import toast from 'react-hot-toast';
import RegistroGastosPage from '../pages/registro-gastos';
import { householdExpensesAPI } from '../services/api';

jest.mock('../components/layout/Layout', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('react-hot-toast', () => {
  const t: any = jest.fn();
  t.success = jest.fn();
  t.error = jest.fn();
  return { __esModule: true, default: t };
});
jest.mock('../store/currency.store', () => ({
  useCurrencyStore: () => ({
    activeCurrencyCode: 'USD',
    rates: { USD: 1 },
    currencies: [{ currencyCode: 'USD', symbol: '$', isLocal: true }],
  }),
}));
jest.mock('../services/api', () => ({
  householdExpensesAPI: { getMonth: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));

const item = (id: string, categoria: string, monto: number) => ({
  id, fecha: '2026-11-05', descripcion: `Gasto ${id}`, categoria, monto, moneda: 'USD', montoLocal: monto, montoCUP: monto, lugar: '',
});

const month = (over: any = {}) => ({
  month: '2026-11', comprasMercado: [], totalCompras: 0, resumenCategoria: [], unconvertedItems: 0, monedaLocal: 'USD',
  monedas: [{ code: 'USD', symbol: '$' }],
  salidas: [item('s1', 'Salidas', 82), item('o1', 'Transporte', 30)], totalSalidas: 112, total: 112,
  outings: { items: [item('s1', 'Salidas', 82)], total: 82, budget: 120, remaining: 38, exceeded: false },
  otros: { items: [item('o1', 'Transporte', 30)], total: 30 },
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><RegistroGastosPage /></QueryClientProvider>);
}

describe('RegistroGastosPage outings and other expenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (householdExpensesAPI.getMonth as jest.Mock).mockResolvedValue({ data: month() });
    (householdExpensesAPI.create as jest.Mock).mockResolvedValue({ data: { id: 'n', budgetWarning: null } });
  });

  it('shows outings and other expenses in separate sections', async () => {
    renderPage();
    const salidas = await screen.findByRole('region', { name: 'Salidas' });
    const otros = screen.getByRole('region', { name: 'Otros gastos' });
    expect(within(salidas).getByText('Gasto s1')).toBeInTheDocument();
    expect(within(salidas).queryByText('Gasto o1')).toBeNull();
    expect(within(otros).getByText('Gasto o1')).toBeInTheDocument();
  });

  it('shows spent vs budget with a green bar and what is left', async () => {
    renderPage();
    const salidas = await screen.findByRole('region', { name: 'Salidas' });
    expect(within(salidas).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '68');
    expect(within(salidas).getByText(/Te quedan/)).toBeInTheDocument();
    expect(within(salidas).queryByRole('alert')).toBeNull();
  });

  it('shows the exceeded state with an alert and how much over', async () => {
    (householdExpensesAPI.getMonth as jest.Mock).mockResolvedValue({
      data: month({ outings: { items: [item('s1', 'Salidas', 138)], total: 138, budget: 120, remaining: -18, exceeded: true } }),
    });
    renderPage();
    const salidas = await screen.findByRole('region', { name: 'Salidas' });
    expect(within(salidas).getByText(/Te pasaste por/)).toBeInTheDocument();
    expect(within(salidas).getByRole('alert')).toHaveTextContent(/Superaste el presupuesto de Salidas/);
  });

  it('shows no bar and links to the budget when there is no Salidas budget', async () => {
    (householdExpensesAPI.getMonth as jest.Mock).mockResolvedValue({
      data: month({ outings: { items: [item('s1', 'Salidas', 82)], total: 82, budget: null, remaining: null, exceeded: false } }),
    });
    renderPage();
    const salidas = await screen.findByRole('region', { name: 'Salidas' });
    expect(within(salidas).queryByRole('progressbar')).toBeNull();
    expect(within(salidas).getByRole('link', { name: /presupuesto/i })).toHaveAttribute('href', '/presupuesto');
  });

  it('warns in the form when a new outing would pass the budget, and still saves it', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /nueva salida/i }));
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'Salidas');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Cena de aniversario');
    await userEvent.type(screen.getByLabelText('Monto'), '45');
    expect(await screen.findByText(/superarías el presupuesto/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(householdExpensesAPI.create).toHaveBeenCalledWith(expect.objectContaining({ categoria: 'Salidas', monto: 45 })));
  });

  it('does not warn for other categories', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /nueva salida/i }));
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'Transporte');
    await userEvent.type(screen.getByLabelText('Monto'), '500');
    expect(screen.queryByText(/superarías el presupuesto/i)).toBeNull();
  });

  it('tells the user when the saved outing left the month over budget', async () => {
    (householdExpensesAPI.create as jest.Mock).mockResolvedValue({
      data: { id: 'n', budgetWarning: { budget: 120, spent: 138, exceededBy: 18 } },
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /nueva salida/i }));
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'Salidas');
    await userEvent.type(screen.getByLabelText('Descripción'), 'Cena');
    await userEvent.type(screen.getByLabelText('Monto'), '5');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.stringMatching(/superaste el presupuesto de salidas/i), expect.anything()));
  });

  it('falls back to a single list when the server sends no outings block', async () => {
    (householdExpensesAPI.getMonth as jest.Mock).mockResolvedValue({ data: month({ outings: undefined, otros: undefined }) });
    renderPage();
    expect(await screen.findByText('Gasto s1')).toBeInTheDocument();
    expect(screen.getByText('Gasto o1')).toBeInTheDocument();
  });
});
