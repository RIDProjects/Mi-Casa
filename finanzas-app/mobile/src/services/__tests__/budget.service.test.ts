import apiClient from '../apiClient';
import { budgetService } from '../budget.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

describe('budgetService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getCurrent returns the first budget or null', async () => {
    api.get.mockResolvedValue({ data: [{ id: 'b1' }, { id: 'b2' }] });
    expect(await budgetService.getCurrent()).toEqual({ id: 'b1' });
    api.get.mockResolvedValue({ data: null });
    expect(await budgetService.getCurrent()).toBeNull();
  });

  it('addIncome posts to the budget income route', async () => {
    api.post.mockResolvedValue({ data: {} });
    await budgetService.addIncome('b1', { name: 'Sueldo', type: 'salary', amount: 900 });
    expect(api.post).toHaveBeenCalledWith('/budget/b1/income', { name: 'Sueldo', type: 'salary', amount: 900 });
  });

  it('updateIncome puts on the income id', async () => {
    api.put.mockResolvedValue({ data: {} });
    await budgetService.updateIncome('i1', { amount: 1000 });
    expect(api.put).toHaveBeenCalledWith('/budget/income/i1', { amount: 1000 });
  });

  it('removeIncome deletes the income id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await budgetService.removeIncome('i1');
    expect(api.delete).toHaveBeenCalledWith('/budget/income/i1');
  });

  it('addCategory posts to the budget categories route', async () => {
    api.post.mockResolvedValue({ data: {} });
    await budgetService.addCategory('b1', { name: 'Casa' });
    expect(api.post).toHaveBeenCalledWith('/budget/b1/categories', { name: 'Casa' });
  });

  it('updateCategory patches the category id', async () => {
    api.patch.mockResolvedValue({ data: {} });
    await budgetService.updateCategory('c1', { name: 'Hogar' });
    expect(api.patch).toHaveBeenCalledWith('/budget/categories/c1', { name: 'Hogar' });
  });

  it('removeCategory deletes the category id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await budgetService.removeCategory('c1');
    expect(api.delete).toHaveBeenCalledWith('/budget/categories/c1');
  });

  it('addExpense posts to the category expenses route', async () => {
    api.post.mockResolvedValue({ data: {} });
    const dto = { name: 'Netflix', amount: 12, periodicity: 'monthly' as const, isFixed: true, isCreditCard: false, isAntExpense: false };
    await budgetService.addExpense('c1', dto);
    expect(api.post).toHaveBeenCalledWith('/budget/categories/c1/expenses', dto);
  });

  it('updateExpense puts on the expense id', async () => {
    api.put.mockResolvedValue({ data: {} });
    await budgetService.updateExpense('e1', { amount: 20, periodicity: 'annual' });
    expect(api.put).toHaveBeenCalledWith('/budget/expenses/e1', { amount: 20, periodicity: 'annual' });
  });

  it('removeExpense deletes the expense id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await budgetService.removeExpense('e1');
    expect(api.delete).toHaveBeenCalledWith('/budget/expenses/e1');
  });
});
