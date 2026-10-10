import { UsersService } from './users.service';

const leaky = () => ({
  id: 'u1',
  email: 'u1@x.com',
  name: 'U',
  isActive: true,
  roles: [],
  password: 'hash',
  resetToken: 'secret-token',
  resetTokenExpiry: new Date(),
});

describe('UsersService output', () => {
  let userRepo: any;
  let roleRepo: any;
  let service: UsersService;

  beforeEach(() => {
    userRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn(async (u) => u),
    };
    roleRepo = { findBy: jest.fn().mockResolvedValue([]) };
    service = new UsersService(userRepo, roleRepo);
  });

  const expectNoSecrets = (value: any) => {
    const json = JSON.stringify(value);
    expect(json).not.toContain('secret-token');
    expect(json).not.toContain('resetToken');
    expect(json).not.toContain('"password"');
  };

  it('findAll', async () => {
    userRepo.find.mockResolvedValue([leaky()]);
    expectNoSecrets(await service.findAll());
  });

  it('findOne', async () => {
    userRepo.findOne.mockResolvedValue(leaky());
    expectNoSecrets(await service.findOne('u1'));
  });

  it('create', async () => {
    userRepo.findOne.mockResolvedValue(null);
    userRepo.save.mockResolvedValue(leaky());
    expectNoSecrets(await service.create({ email: 'u1@x.com', name: 'U', password: 'Password123' } as any));
  });

  it('update does not return the password hash', async () => {
    userRepo.findOne.mockResolvedValue(leaky());
    expectNoSecrets(await service.update('u1', { password: 'NewPassword1' } as any));
  });
});
