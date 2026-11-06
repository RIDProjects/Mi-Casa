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
      { id: 'd2', personName: 'Luis', type: 'they_owe_me', amount: 500, minimumPayment: 50, isPaid: false },
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

  it('sums the monthly amount of all lines', async () => {
    loans.findByHouse.mockResolvedValue([{ id: 'l1', tipo: 'A', institucion: 'B', cuotaMensual: 400.5, deudaActual: 1 }]);
    cuotas.getActiveCuotas.mockResolvedValue([
      { id: 'c1', description: 'X', installmentAmount: 59.5, totalInstallments: 2, paidInstallments: 0 },
    ]);

    expect(await service.getMonthlyTotal(HOUSE)).toBe(460);
  });
});
