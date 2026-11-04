import { QueryClient } from '@tanstack/react-query';
import { invalidateBudget } from '../shared';

describe('invalidateBudget', () => {
  it('invalidates the budget and every module that derives from it', () => {
    const qc = new QueryClient();
    const spy = jest.spyOn(qc, 'invalidateQueries');
    invalidateBudget(qc);
    const keys = spy.mock.calls.map(([arg]: any) => arg.queryKey[0]);
    expect(keys).toEqual(expect.arrayContaining([
      'budget', 'summary', 'emergency-fund', 'emergency-fund-coverage', 'savings-goals', 'purchaseLists',
    ]));
  });
});
