import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTableSort } from '../../../hooks/useTableSort';
import { SortableTh } from '../SortableTh';

type Row = { id: string; name: string; amount: number; date: string };
const rows: Row[] = [
  { id: 'r1', name: 'Luz', amount: 40, date: '2026-01-10' },
  { id: 'r2', name: 'Agua', amount: 300, date: '2026-03-05' },
  { id: 'r3', name: 'Gas', amount: 120, date: '2026-02-01' },
];

function Harness({ initial }: { initial?: { key: string; dir: 'asc' | 'desc' } }) {
  const { sorted, sort, toggle } = useTableSort<Row>(rows, {
    name: r => r.name,
    amount: r => r.amount,
    date: r => r.date,
  }, initial);
  return (
    <table>
      <thead>
        <tr>
          <SortableTh label="Nombre" sortKey="name" sort={sort} onSort={toggle} />
          <SortableTh label="Monto" sortKey="amount" sort={sort} onSort={toggle} align="right" />
          <SortableTh label="Fecha" sortKey="date" sort={sort} onSort={toggle} />
        </tr>
      </thead>
      <tbody>{sorted.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.amount}</td><td>{r.date}</td></tr>)}</tbody>
    </table>
  );
}

const names = () => screen.getAllByRole('row').slice(1).map(tr => within(tr).getAllByRole('cell')[0].textContent);

describe('SortableTh + useTableSort', () => {
  it('keeps the data order until a column is chosen', () => {
    render(<Harness />);
    expect(names()).toEqual(['Luz', 'Agua', 'Gas']);
  });

  it('applies the initial sort', () => {
    render(<Harness initial={{ key: 'amount', dir: 'desc' }} />);
    expect(names()).toEqual(['Agua', 'Gas', 'Luz']);
    expect(screen.getByRole('columnheader', { name: /monto/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts by the clicked column and flips the direction on a second click', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /nombre/i }));
    expect(names()).toEqual(['Agua', 'Gas', 'Luz']);
    expect(screen.getByRole('columnheader', { name: /nombre/i })).toHaveAttribute('aria-sort', 'ascending');
    await user.click(screen.getByRole('button', { name: /nombre/i }));
    expect(names()).toEqual(['Luz', 'Gas', 'Agua']);
    expect(screen.getByRole('columnheader', { name: /nombre/i })).toHaveAttribute('aria-sort', 'descending');
  });

  it('starts a newly chosen amount or date column from the largest/latest first', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /monto/i }));
    expect(names()).toEqual(['Agua', 'Gas', 'Luz']);
    await user.click(screen.getByRole('button', { name: /fecha/i }));
    expect(names()).toEqual(['Agua', 'Gas', 'Luz']);
  });

  it('marks only the active column', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /fecha/i }));
    expect(screen.getByRole('columnheader', { name: /nombre/i })).not.toHaveAttribute('aria-sort', 'ascending');
    expect(screen.getByRole('columnheader', { name: /fecha/i })).toHaveAttribute('aria-sort');
  });
});
