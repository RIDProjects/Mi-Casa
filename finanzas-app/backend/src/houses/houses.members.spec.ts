import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { HousesService } from './houses.service';

describe('HousesService member management', () => {
  let houseRepo: any;
  let userRepo: any;
  let roleRepo: any;
  let invitationRepo: any;
  let notifications: any;
  let service: HousesService;

  const house = { id: 'h1', name: 'Casa' };
  const admin = { id: 'a1', roles: [{ name: 'house_admin' }], houses: [house] };
  const plainMember = { id: 'm1', roles: [{ name: 'user' }], houses: [house] };

  beforeEach(() => {
    houseRepo = { findOne: jest.fn().mockResolvedValue(house) };
    userRepo = { findOne: jest.fn(), save: jest.fn(async (u) => u), create: jest.fn((d) => d) };
    roleRepo = { findOne: jest.fn().mockResolvedValue({ name: 'user' }) };
    invitationRepo = { findOne: jest.fn(), create: jest.fn((d) => d), save: jest.fn() };
    notifications = { sendHouseInvitation: jest.fn().mockResolvedValue(true) };
    service = new HousesService(houseRepo, userRepo, roleRepo, invitationRepo, {} as any, notifications);
  });

  describe('inviteUser', () => {
    it('never queries users with an undefined email', async () => {
      await expect(service.inviteUser('h1', undefined as any, 'user', 'a1')).rejects.toThrow(BadRequestException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects a blank email', async () => {
      await expect(service.inviteUser('h1', '   ', 'user', 'a1')).rejects.toThrow(BadRequestException);
    });

    it('rejects a plain house member (non-admin)', async () => {
      userRepo.findOne.mockResolvedValue(plainMember);
      await expect(service.inviteUser('h1', 'new@x.com', 'house_admin', 'm1')).rejects.toThrow(ForbiddenException);
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(invitationRepo.save).not.toHaveBeenCalled();
    });

    it('lets a house admin of that house invite', async () => {
      userRepo.findOne.mockResolvedValueOnce(admin).mockResolvedValueOnce(null).mockResolvedValueOnce(admin);
      invitationRepo.findOne.mockResolvedValue(null);
      const res = await service.inviteUser('h1', 'New@X.com', 'user', 'a1');
      expect(res.status).toBe('invitation_sent');
      expect(invitationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@x.com' }));
    });
  });

  describe('createHouseMember', () => {
    it('rejects a missing password before hashing', async () => {
      await expect(
        service.createHouseMember('h1', { name: 'Ana', email: 'a@x.com' } as any, 'a1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a missing email without querying users', async () => {
      await expect(
        service.createHouseMember('h1', { name: 'Ana', password: 'secret1' } as any, 'a1'),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects a non-admin requester', async () => {
      userRepo.findOne.mockResolvedValue(plainMember);
      await expect(
        service.createHouseMember('h1', { name: 'Ana', email: 'a@x.com', password: 'secret1' }, 'm1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  it('toggleUserActive and removeUserFromHouse reject non-admins', async () => {
    userRepo.findOne.mockResolvedValue(plainMember);
    await expect(service.toggleUserActive('h1', 'u2', 'm1')).rejects.toThrow(ForbiddenException);
    await expect(service.removeUserFromHouse('h1', 'u2', 'm1')).rejects.toThrow(ForbiddenException);
  });
});
