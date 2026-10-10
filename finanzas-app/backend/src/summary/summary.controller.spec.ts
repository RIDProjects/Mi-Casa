import { ForbiddenException } from '@nestjs/common';
import { SummaryController } from './summary.controller';

describe('SummaryController without an active house', () => {
  const service = {
    getSummary: jest.fn(),
    getUpcomingBills: jest.fn(),
    getSpendingInsights: jest.fn(),
    getHealthScore: jest.fn(),
  };
  const controller = new SummaryController(service as any);
  const req: any = { user: { house: null, activeHouseId: null, houses: [] } };

  beforeEach(() => jest.clearAllMocks());

  it('rejects with 403 and never reaches the service with an empty id', () => {
    expect(() => controller.getSummary(req)).toThrow(ForbiddenException);
    expect(() => controller.getUpcomingBills(req, 7)).toThrow(ForbiddenException);
    expect(() => controller.getSpendingInsights(req)).toThrow(ForbiddenException);
    expect(() => controller.getHealthScore(req)).toThrow(ForbiddenException);
    Object.values(service).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it('passes the house id through when present', () => {
    controller.getSummary({ user: { house: { id: 'h1' } } } as any);
    expect(service.getSummary).toHaveBeenCalledWith('h1');
  });
});
