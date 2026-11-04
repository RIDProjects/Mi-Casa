import { PurchasesService } from './purchases.service';

describe('PurchasesService budget sync', () => {
  function build(lists: any[], shoppingBudget: number | null = 500) {
    const listRepo: any = {
      find: jest.fn().mockResolvedValue(lists),
      findOne: jest.fn(async () => lists[0]),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    const budgetService: any = { getShoppingBudget: jest.fn().mockResolvedValue(shoppingBudget) };
    const service = new PurchasesService(listRepo, {} as any, budgetService);
    return { service, listRepo, budgetService };
  }
  const items = [{ quantity: 2, unitPrice: 100, status: 'pending' }];
  const mk = (over: any = {}) => ({ id: 'l1', budget: 100, items, ...over });

  it('uses the shopping budget from the budget module', async () => {
    const { service } = build([mk()]);
    const res: any = await service.findOneList('l1', 'h1');
    expect(res.budget).toBe(500);
    expect(res.budgetSynced).toBe(true);
    expect(res.summary.budget).toBe(500);
    expect(res.summary.remaining).toBe(300);
  });

  it('has no budget when the budget module defines none (the stored value is ignored)', async () => {
    const { service } = build([mk()], null);
    const res: any = await service.findOneList('l1', 'h1');
    expect(res.budget).toBe(0);
    expect(res.budgetSynced).toBe(false);
    expect(res.summary.budget).toBe(0);
    expect(res.summary.remaining).toBeNull();
  });

  it('findAllLists resolves the shopping budget once for several lists', async () => {
    const { service, budgetService } = build([mk({ id: 'a' }), mk({ id: 'b' }), mk({ id: 'c' })]);
    const res: any[] = await service.findAllLists('h1');
    expect(budgetService.getShoppingBudget).toHaveBeenCalledTimes(1);
    expect(res.map((l) => l.budget)).toEqual([500, 500, 500]);
  });

  it('findAllLists does not query the budget when there are no lists', async () => {
    const { service, budgetService } = build([]);
    await service.findAllLists('h1');
    expect(budgetService.getShoppingBudget).not.toHaveBeenCalled();
  });

  it('updateList ignores dto.budget while the budget module provides one', async () => {
    const list = mk();
    const { service, listRepo } = build([list]);
    await service.updateList('l1', 'h1', { name: 'n', budget: 999 });
    expect(listRepo.save.mock.calls[0][0].budget).toBe(100);
    expect(listRepo.save.mock.calls[0][0].name).toBe('n');
  });

  it('updateList ignores dto.budget even when the budget module has none', async () => {
    const list = mk();
    const { service, listRepo } = build([list], null);
    await service.updateList('l1', 'h1', { name: 'n', budget: 999 });
    expect(listRepo.save.mock.calls[0][0].budget).toBe(100);
  });
});
