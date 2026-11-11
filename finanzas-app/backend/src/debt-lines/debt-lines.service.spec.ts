import { DebtLinesService } from './debt-lines.service';

/**
 * The monthly debt service of a house, one line per obligation, taken from the
 * debt modules: I_OWE debts (minimum payment), loans (monthly payment), active
 * cuotas (installment) and credit cards that are not paid in full (estimate).
 */
describe('DebtLinesService', () => {
  const HOUSE = 'house-1';
  let debts: { findAll: jest.Mock };
  let loans: { findByHouse: jest.Mock };
  let cuotas: { getActiveCuotas: jest.Mock };
  let cards: { findByHouse: jest.Mock };
  let service: DebtLinesService;

  beforeEach(() => {
    debts = { findAll: jest.fn().mockResolvedValue([]) };
    loans = { findByHouse: jest.fn().mockResolvedValue([]) };
    cuotas = { getActiveCuotas: jest.fn().mockResolvedValue([]) };
    cards = { findByHouse: jest.fn().mockResolvedValue([]) };
    service = new DebtLinesService(debts as any, loans as any, cuotas as any, cards as any);
  });

  it('returns no lines when the house has no obligations', async () => {
    expect(await service.getLines(HOUSE)).toEqual([]);
  });

  it('uses the minimum payment of unpaid I_OWE debts and ignores paid and they_owe_me ones', async () => {
    debts.findAll.mockResolvedValue([
      { id: 'd1', personName: 'Ana', type: 'i_owe', amount: 1000, minimumPayment: 80, isPaid: false },
      { id: 'd2', personName: 'Luis', type: 'they_owe_me', amount: 500, minimumPayment: 50, isPaid: true },
      { id: 'd3', personName: 'Eva', type: 'i_owe', amount: 300, minimumPayment: 30, isPaid: true },
    ]);

    const lines = await service.getLines(HOUSE);

    expect(lines).toEqual([
      { source: 'debt', id: 'd1', label: 'Ana', monthlyAmount: 80, balance: 1000, estimated: false, interestRate: 0 },
    ]);
  });

  it('estimates 5% of the balance (min 0) for an I_OWE debt without a minimum payment', async () => {
    debts.findAll.mockResolvedValue([
      { id: 'd1', personName: 'Ana', type: 'i_owe', amount: 1000, minimumPayment: null, isPaid: false },
    ]);

    const [line] = await service.getLines(HOUSE);

    expect(line.monthlyAmount).toBe(50);
    expect(line.estimated).toBe(true);
  });

  it('treats a zero minimum payment as not set and estimates 5% of the balance', async () => {
    // The debt form saves 0 when the minimum payment is left empty.
    debts.findAll.mockResolvedValue([
      { id: 'd1', personName: 'Paypal', type: 'i_owe', amount: '400.00', minimumPayment: '0.00', isPaid: false, interestRate: '0.0000' },
    ]);

    const [line] = await service.getLines(HOUSE);

    expect(line.monthlyAmount).toBe(20);
    expect(line.estimated).toBe(true);
  });

  describe('offset against what is owed to the house', () => {
    const owe = (id: string, amount: number, over: any = {}) => ({
      id, personName: id, type: 'i_owe', amount, minimumPayment: null, isPaid: false, priority: 'media', interestRate: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'), ...over,
    });
    const owed = (id: string, amount: number, over: any = {}) => ({ id, personName: id, type: 'they_owe_me', amount, isPaid: false, ...over });

    it('drops the debts fully covered by what is owed and keeps the rest', async () => {
      debts.findAll.mockResolvedValue([owed('o1', 500), owe('hi', 300, { priority: 'alta', minimumPayment: 20 }), owe('mid', 600, { minimumPayment: 80 })]);

      const lines = await service.getLines(HOUSE);

      // 500 covers "hi" (300) and 200 of "mid"; 400 of "mid" stays
      expect(lines).toEqual([
        { source: 'debt', id: 'mid', label: 'mid', monthlyAmount: 80, balance: 400, estimated: false, interestRate: 0 },
      ]);
    });

    it('estimates 5% of the uncovered balance when the debt has no minimum payment', async () => {
      debts.findAll.mockResolvedValue([owed('o1', 500), owe('d', 600)]);

      const [line] = await service.getLines(HOUSE);

      expect(line.balance).toBe(100);
      expect(line.monthlyAmount).toBe(5);
      expect(line.estimated).toBe(true);
    });

    it('caps the minimum payment at the uncovered balance', async () => {
      debts.findAll.mockResolvedValue([owed('o1', 570), owe('d', 600, { minimumPayment: 80 })]);

      const [line] = await service.getLines(HOUSE);

      expect(line.balance).toBe(30);
      expect(line.monthlyAmount).toBe(30);
    });

    it('walks by priority, so the low-priority debt is the one left for the budget', async () => {
      debts.findAll.mockResolvedValue([
        owe('low', 100, { priority: 'baja', minimumPayment: 10 }),
        owe('high', 100, { priority: 'alta', minimumPayment: 10 }),
        owed('o1', 100),
      ]);

      const lines = await service.getLines(HOUSE);

      expect(lines.map(l => l.id)).toEqual(['low']);
    });

    it('does not count what is owed once it is marked as paid', async () => {
      debts.findAll.mockResolvedValue([owed('o1', 500, { isPaid: true }), owe('d', 200, { minimumPayment: 20 })]);

      const [line] = await service.getLines(HOUSE);

      expect(line.balance).toBe(200);
    });

    it('treats a debt without priority as media (rows created before the column existed)', async () => {
      debts.findAll.mockResolvedValue([owe('old', 100, { priority: undefined, minimumPayment: 10 }), owe('hi', 100, { priority: 'alta', minimumPayment: 10 }), owed('o1', 100)]);

      const lines = await service.getLines(HOUSE);

      expect(lines.map(l => l.id)).toEqual(['old']);
    });
  });

  it('takes the monthly payment of every loan with one', async () => {
    loans.findByHouse.mockResolvedValue([
      { id: 'l1', tipo: 'Hipoteca', institucion: 'Banco A', cuotaMensual: 400, deudaActual: 20000 },
      { id: 'l2', tipo: 'Auto', institucion: 'Banco B', cuotaMensual: 0, deudaActual: 0 },
    ]);

    const lines = await service.getLines(HOUSE);

    expect(lines).toEqual([
      { source: 'loan', id: 'l1', label: 'Hipoteca - Banco A', monthlyAmount: 400, balance: 20000, estimated: false, interestRate: 0 },
    ]);
  });

  it('takes the installment of every active cuota with its remaining balance', async () => {
    cuotas.getActiveCuotas.mockResolvedValue([
      { id: 'c1', description: 'Laptop', installmentAmount: 60, totalInstallments: 10, paidInstallments: 4 },
    ]);

    const lines = await service.getLines(HOUSE);

    expect(lines).toEqual([
      { source: 'cuota', id: 'c1', label: 'Laptop', monthlyAmount: 60, balance: 360, estimated: false, interestRate: 0 },
    ]);
  });

  it('estimates 5% of the balance for cards not paid in full and skips full-payment cards', async () => {
    cards.findByHouse.mockResolvedValue([
      { id: 'k1', banco: 'Visa', nombreTarjeta: 'Gold', saldoActual: 2000, tipoPago: 'minimum' },
      { id: 'k2', banco: 'Mc', nombreTarjeta: 'Black', saldoActual: 900, tipoPago: 'full' },
      { id: 'k3', banco: 'Amex', nombreTarjeta: 'Blue', saldoActual: 0, tipoPago: 'partial' },
    ]);

    const lines = await service.getLines(HOUSE);

    expect(lines).toEqual([
      { source: 'card', id: 'k1', label: 'Visa Gold', monthlyAmount: 100, balance: 2000, estimated: true, interestRate: 0 },
    ]);
  });

  it('never turns a debit card into a debt line', async () => {
    cards.findByHouse.mockResolvedValue([
      { id: 'd1', banco: 'Banco', nombreTarjeta: 'Debito', saldoActual: 500, tipo: 'debit', tipoPago: 'minimum' },
    ]);

    expect(await service.getLines(HOUSE)).toEqual([]);
  });

  it('sums the monthly amount of all lines', async () => {
    loans.findByHouse.mockResolvedValue([{ id: 'l1', tipo: 'A', institucion: 'B', cuotaMensual: 400.5, deudaActual: 1 }]);
    cuotas.getActiveCuotas.mockResolvedValue([
      { id: 'c1', description: 'X', installmentAmount: 59.5, totalInstallments: 2, paidInstallments: 0 },
    ]);

    expect(await service.getMonthlyTotal(HOUSE)).toBe(460);
  });
});
