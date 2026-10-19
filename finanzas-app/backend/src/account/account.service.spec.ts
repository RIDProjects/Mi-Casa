import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AccountService } from './account.service';

describe('AccountService.deleteAccount', () => {
  const USER_ID = 'u1';
  let userRepo: any;
  let housesService: any;
  let service: AccountService;
  let hash: string;

  beforeAll(async () => {
    hash = await bcrypt.hash('correct-password', 4);
  });

  beforeEach(() => {
    userRepo = {
      findOne: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    housesService = {
      getHouseMembers: jest.fn(),
      deleteHouse: jest.fn().mockResolvedValue({ message: 'Casa eliminada' }),
    };
    service = new AccountService(userRepo, housesService);
  });

  function givenUser(roles: string[], houseIds: string[]) {
    userRepo.findOne.mockImplementation(async (opts: any) =>
      opts.select
        ? { id: USER_ID, password: hash }
        : { id: USER_ID, roles: roles.map((name) => ({ name })), houses: houseIds.map((id) => ({ id })) },
    );
  }

  it('rejects a wrong password and deletes nothing', async () => {
    givenUser(['house_admin'], ['h1']);
    await expect(service.deleteAccount(USER_ID, 'nope')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userRepo.remove).not.toHaveBeenCalled();
    expect(housesService.deleteHouse).not.toHaveBeenCalled();
  });

  it('refuses global admin accounts', async () => {
    givenUser(['admin'], []);
    await expect(service.deleteAccount(USER_ID, 'correct-password')).rejects.toBeInstanceOf(ForbiddenException);
    expect(userRepo.remove).not.toHaveBeenCalled();
  });

  it('removes the user and purges only houses where they were the last member', async () => {
    givenUser(['house_admin'], ['solo', 'shared']);
    housesService.getHouseMembers.mockImplementation(async (id: string) =>
      id === 'solo' ? [{ id: USER_ID }] : [{ id: USER_ID }, { id: 'other' }],
    );

    await expect(service.deleteAccount(USER_ID, 'correct-password')).resolves.toEqual({
      message: 'Cuenta eliminada',
    });

    expect(userRepo.remove).toHaveBeenCalledTimes(1);
    expect(housesService.deleteHouse).toHaveBeenCalledTimes(1);
    expect(housesService.deleteHouse).toHaveBeenCalledWith('solo');
    // the house is purged only after the user stopped being a member
    expect(userRepo.remove.mock.invocationCallOrder[0]).toBeLessThan(
      housesService.deleteHouse.mock.invocationCallOrder[0],
    );
  });

  it('still succeeds when purging an orphaned house fails', async () => {
    givenUser(['house_admin'], ['solo']);
    housesService.getHouseMembers.mockResolvedValue([{ id: USER_ID }]);
    housesService.deleteHouse.mockRejectedValue(new Error('fk'));
    await expect(service.deleteAccount(USER_ID, 'correct-password')).resolves.toEqual({
      message: 'Cuenta eliminada',
    });
    expect(userRepo.remove).toHaveBeenCalledTimes(1);
  });
});
