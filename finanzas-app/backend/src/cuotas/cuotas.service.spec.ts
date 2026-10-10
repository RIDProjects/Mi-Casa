import { CuotasService } from './cuotas.service';

describe('CuotasService next payment date', () => {
  function build(cuota: any) {
    const repo = { find: jest.fn().mockResolvedValue([cuota]) } as any;
    return new CuotasService(repo);
  }
  const base = { totalInstallments: 12, installmentAmount: 100 };

  it('clamps a 31st start to the end of February, then back to the 31st', async () => {
    const feb = await build({ ...base, startDate: '2026-01-31', paidInstallments: 1 }).findByHouse('h');
    expect(feb[0].nextPaymentDate).toBe('2026-02-28');
    const mar = await build({ ...base, startDate: '2026-01-31', paidInstallments: 2 }).findByHouse('h');
    expect(mar[0].nextPaymentDate).toBe('2026-03-31');
  });

  it('returns the start date when nothing is paid', async () => {
    const res = await build({ ...base, startDate: '2026-01-31', paidInstallments: 0 }).findByHouse('h');
    expect(res[0].nextPaymentDate).toBe('2026-01-31');
  });
});
