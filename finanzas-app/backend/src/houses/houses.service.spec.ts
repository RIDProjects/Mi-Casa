import { HousesService } from './houses.service';

const leaky = (id: string) => ({
  id,
  email: `${id}@x.com`,
  name: id,
  isActive: true,
  password: 'hash',
  resetToken: 'secret-token',
  resetTokenExpiry: new Date(),
});

describe('HousesService member output', () => {
  let houseRepo: any;
  let userRepo: any;
  let service: HousesService;

  beforeEach(() => {
    houseRepo = { findOne: jest.fn(), find: jest.fn() };
    userRepo = { findOne: jest.fn(), save: jest.fn(async (u) => u) };
    service = new HousesService(houseRepo, userRepo, {} as any, {} as any, {} as any, {} as any);
  });

  const expectNoSecrets = (value: any) => {
    const json = JSON.stringify(value);
    expect(json).not.toContain('secret-token');
    expect(json).not.toContain('resetToken');
    expect(json).not.toContain('"password"');
  };

  it('getHouseMembers returns no sensitive fields', async () => {
    houseRepo.findOne.mockResolvedValue({ id: 'h1', members: [leaky('u1'), leaky('u2')] });
    const members = await service.getHouseMembers('h1');
    expect(members).toHaveLength(2);
    expect(members[0]).toMatchObject({ id: 'u1', email: 'u1@x.com', isActive: true });
    expectNoSecrets(members);
  });

  it('findOne strips sensitive fields from house.members', async () => {
    houseRepo.findOne.mockResolvedValue({ id: 'h1', name: 'H', members: [leaky('u1')] });
    const house = await service.findOne('h1', 'u1');
    expectNoSecrets(house);
  });

  it('findAll strips sensitive fields from house.members', async () => {
    houseRepo.find.mockResolvedValue([{ id: 'h1', members: [leaky('u1')] }]);
    expectNoSecrets(await service.findAll());
  });

  it('toggleUserActive returns a safe user', async () => {
    houseRepo.findOne.mockResolvedValue({ id: 'h1', members: [leaky('u2')] });
    userRepo.findOne
      .mockResolvedValueOnce({ roles: [{ name: 'admin' }], houses: [] })
      .mockResolvedValueOnce(leaky('u2'));
    expectNoSecrets(await service.toggleUserActive('h1', 'u2', 'admin1'));
  });

  it('switchUserHouse returns a safe user', async () => {
    userRepo.findOne.mockResolvedValue({ ...leaky('u1'), roles: [{ name: 'user' }], houses: [{ id: 'h1' }] });
    houseRepo.findOne.mockResolvedValue({ id: 'h1' });
    expectNoSecrets(await service.switchUserHouse('u1', 'h1'));
  });
});
