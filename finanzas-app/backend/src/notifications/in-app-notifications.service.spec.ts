import { InAppNotificationsService } from './in-app-notifications.service';

describe('InAppNotificationsService.createIfNotRecent', () => {
  let repo: any;
  let service: InAppNotificationsService;
  const data = { type: 'upcoming_bill_debt_visa_2026-10-12', title: 'T', message: 'M' };

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'n1', ...x })),
    };
    service = new InAppNotificationsService(repo);
  });

  it('by default only dedupes against unread notifications', async () => {
    await service.createIfNotRecent('h1', data);
    expect(repo.findOne.mock.calls[0][0].where).toMatchObject({ houseId: 'h1', type: data.type, isRead: false });
  });

  it('skips creation when a recent unread one exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'old' });
    expect(await service.createIfNotRecent('h1', data)).toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('includeRead dedupes regardless of the read flag', async () => {
    await service.createIfNotRecent('h1', data, 96, { includeRead: true });
    const where = repo.findOne.mock.calls[0][0].where;
    expect(where).toMatchObject({ houseId: 'h1', type: data.type });
    expect(where).not.toHaveProperty('isRead');
  });
});
