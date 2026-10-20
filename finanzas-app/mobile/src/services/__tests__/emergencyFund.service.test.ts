import apiClient from '../apiClient';
import { emergencyFundService } from '../emergencyFund.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

describe('emergencyFundService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAll requests /emergency-fund and returns the list', async () => {
    api.get.mockResolvedValue({ data: [{ id: 'f1' }] });
    expect(await emergencyFundService.getAll()).toEqual([{ id: 'f1' }]);
    expect(api.get).toHaveBeenCalledWith('/emergency-fund');
  });

  it('getAll falls back to an empty list on a non-array body', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await emergencyFundService.getAll()).toEqual([]);
  });

  it('getCoverage requests /emergency-fund/coverage', async () => {
    const coverage = { balance: 100, monthlyExpenses: 50, monthsCovered: 2, targetMonths: 6, status: 'critical' };
    api.get.mockResolvedValue({ data: coverage });
    expect(await emergencyFundService.getCoverage()).toEqual(coverage);
    expect(api.get).toHaveBeenCalledWith('/emergency-fund/coverage');
  });
});
