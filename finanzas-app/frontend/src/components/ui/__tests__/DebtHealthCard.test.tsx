import React from 'react';
import { render, screen } from '@testing-library/react';
import { DebtHealthView, DebtHealth } from '../DebtHealthCard';

const fmt = (n: number) => `$${n}`;

const base: DebtHealth = {
  status: 'bien',
  debtToIncomePercent: 10,
  monthlyIncome: 3000,
  monthlyDebtService: 300,
  available: 600,
  extraPayment: 250,
  totalBalance: 3600,
  monthsToPayoff: 6,
  horizon: 'corto',
  feasible: true,
  lines: [],
};

describe('DebtHealthView', () => {
  it('renders nothing when there are no debts', () => {
    const { container } = render(<DebtHealthView data={{ ...base, status: 'sin_deudas' }} fmt={fmt} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the verdict, the ratio and the short-term payoff', () => {
    render(<DebtHealthView data={base} fmt={fmt} />);
    expect(screen.getByText('Vas bien con tus deudas')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText("$300")).toBeInTheDocument();
    expect(screen.getByText("$250")).toBeInTheDocument();
    expect(screen.getByText(/6 meses/)).toBeInTheDocument();
    expect(screen.getByText(/corto plazo/)).toBeInTheDocument();
  });

  it('shows the warning verdict and the medium term', () => {
    render(<DebtHealthView data={{ ...base, status: 'atencion', debtToIncomePercent: 25, monthsToPayoff: 24, horizon: 'mediano' }} fmt={fmt} />);
    expect(screen.getByText('Atención con tus deudas')).toBeInTheDocument();
    expect(screen.getByText(/24 meses/)).toBeInTheDocument();
    expect(screen.getByText(/mediano plazo/)).toBeInTheDocument();
  });

  it('explains when the payments do not cover the interest', () => {
    render(<DebtHealthView data={{ ...base, status: 'riesgo', feasible: false, horizon: 'no_alcanza' }} fmt={fmt} />);
    expect(screen.getByText('Tus deudas están en riesgo')).toBeInTheDocument();
    expect(screen.getByText(/no cubren los intereses/)).toBeInTheDocument();
  });

  it('warns when the expenses exceed the income', () => {
    render(<DebtHealthView data={{ ...base, status: 'riesgo', available: -50, extraPayment: 0 }} fmt={fmt} />);
    expect(screen.getByText(/gastos superan tus ingresos/)).toBeInTheDocument();
  });

  it('shows a dash instead of a ratio when there is no income', () => {
    render(<DebtHealthView data={{ ...base, status: 'riesgo', debtToIncomePercent: null, monthlyIncome: 0 }} fmt={fmt} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
