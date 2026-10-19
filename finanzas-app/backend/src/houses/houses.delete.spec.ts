import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HousesService } from './houses.service';
import { House } from '../database/entities/house.entity';

describe('HousesService.deleteHouse', () => {
  let houseRepo: any;
  let em: any;
  let service: HousesService;

  beforeEach(() => {
    em = {
      query: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    houseRepo = {
      findOne: jest.fn(),
      manager: { transaction: jest.fn(async (cb: any) => cb(em)) },
    };
    service = new HousesService(houseRepo, {} as any, {} as any, {} as any, {} as any, {} as any);
  });

  it('throws NotFound when the house does not exist', async () => {
    houseRepo.findOne.mockResolvedValue(null);
    await expect(service.deleteHouse('h1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to delete a house that still has members and touches nothing', async () => {
    houseRepo.findOne.mockResolvedValue({ id: 'h1', members: [{ id: 'u1' }] });
    await expect(service.deleteHouse('h1')).rejects.toBeInstanceOf(BadRequestException);
    expect(houseRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('purges rows referencing the house, then deletes the house, in one transaction', async () => {
    houseRepo.findOne.mockResolvedValue({ id: 'h1', members: [] });
    em.query
      .mockResolvedValueOnce([{ tbl: 'debts', col: 'house_id' }, { tbl: '"app_notifications"', col: 'house_id' }])
      .mockResolvedValue(undefined);

    await expect(service.deleteHouse('h1')).resolves.toEqual({ message: 'Casa eliminada' });

    const deletes = em.query.mock.calls.slice(1).map((c: any[]) => [c[0], c[1]]);
    expect(deletes).toEqual([
      ['DELETE FROM debts WHERE house_id = $1', ['h1']],
      ['DELETE FROM "app_notifications" WHERE house_id = $1', ['h1']],
    ]);
    expect(em.delete).toHaveBeenCalledWith(House, 'h1');
  });

  it('maps a foreign-key violation to Conflict', async () => {
    houseRepo.findOne.mockResolvedValue({ id: 'h1', members: [] });
    houseRepo.manager.transaction.mockRejectedValue({ code: '23503' });
    await expect(service.deleteHouse('h1')).rejects.toBeInstanceOf(ConflictException);
  });
});
