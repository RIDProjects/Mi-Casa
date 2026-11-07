import { computeDebtOffset, OffsetDebt } from './debt-offset';

const debt = (id: string, amount: number, priority: OffsetDebt['priority'] = 'media', over: Partial<OffsetDebt> = {}): OffsetDebt => ({
  id, label: id, amount, priority, createdAt: new Date('2026-01-01T00:00:00Z'), ...over,
});

describe('computeDebtOffset', () => {
  it('covers debts in order and leaves only the uncovered remainder of the first one it cannot pay (user example)', () => {
    // owed to me 2000; pos1 500, pos2 1000, pos3 600 -> 100 left on pos3; pos4 and pos5 go in full
    const r = computeDebtOffset({
      owedToMe: 2000,
      debts: [
        debt('p1', 500, 'alta'),
        debt('p2', 1000, 'alta'),
        debt('p3', 600, 'media'),
        debt('p4', 300, 'baja'),
        debt('p5', 50, 'baja'),
      ],
    });

    expect(r.items.map(i => [i.id, i.status, i.covered, i.pending])).toEqual([
      ['p1', 'cubierta', 500, 0],
      ['p2', 'cubierta', 1000, 0],
      ['p3', 'parcial', 500, 100],
      ['p4', 'pendiente', 0, 300],
      ['p5', 'pendiente', 0, 50],
    ]);
    expect(r.totalPending).toBe(450);
    expect(r.totalCovered).toBe(2000);
    expect(r.remainingPool).toBe(0);
  });

  it('walks by priority alta, media, baja regardless of the input order', () => {
    const r = computeDebtOffset({
      owedToMe: 100,
      debts: [debt('low', 100, 'baja'), debt('high', 100, 'alta'), debt('mid', 100, 'media')],
    });
    expect(r.items.map(i => i.id)).toEqual(['high', 'mid', 'low']);
    expect(r.items.map(i => i.status)).toEqual(['cubierta', 'pendiente', 'pendiente']);
  });

  it('walks debts of the same priority oldest first', () => {
    const r = computeDebtOffset({
      owedToMe: 100,
      debts: [
        debt('new', 100, 'alta', { createdAt: new Date('2026-03-01T00:00:00Z') }),
        debt('old', 100, 'alta', { createdAt: new Date('2026-01-01T00:00:00Z') }),
      ],
    });
    expect(r.items.map(i => i.id)).toEqual(['old', 'new']);
    expect(r.items[0].status).toBe('cubierta');
  });

  it('leaves everything pending when nothing is owed to the user', () => {
    const r = computeDebtOffset({ owedToMe: 0, debts: [debt('a', 200), debt('b', 100)] });
    expect(r.items.every(i => i.status === 'pendiente')).toBe(true);
    expect(r.totalPending).toBe(300);
    expect(r.totalCovered).toBe(0);
  });

  it('covers everything and keeps the surplus when more is owed than the debts', () => {
    const r = computeDebtOffset({ owedToMe: 1000, debts: [debt('a', 200), debt('b', 100)] });
    expect(r.items.every(i => i.status === 'cubierta')).toBe(true);
    expect(r.totalPending).toBe(0);
    expect(r.remainingPool).toBe(700);
  });

  it('treats decimal strings from the API as numbers and rounds to cents', () => {
    const r = computeDebtOffset({ owedToMe: '100.10' as any, debts: [debt('a', '60.05' as any), debt('b', '60.05' as any)] });
    expect(r.items.map(i => [i.covered, i.pending])).toEqual([[60.05, 0], [40.05, 20]]);
  });

  it('returns an empty result without debts', () => {
    const r = computeDebtOffset({ owedToMe: 500, debts: [] });
    expect(r.items).toEqual([]);
    expect(r.remainingPool).toBe(500);
  });
});
