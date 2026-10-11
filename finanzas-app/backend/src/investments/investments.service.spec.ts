import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InvestmentsService } from './investments.service';
import { Investment } from '../database/entities/investment.entity';
import { HouseCurrenciesService } from '../house-currencies/house-currencies.service';

describe('InvestmentsService currencies', () => {
  let service: InvestmentsService;
  let repo: jest.Mocked<Pick<Repository<Investment>, 'create' | 'save' | 'findOne'>>;
  let currencies: { findByHouse: jest.Mock; getLocalCurrency: jest.Mock };
  const HOUSE_ID = 'house-1';

  beforeEach(() => {
    repo = {
      create: jest.fn((v: any) => v),
      save: jest.fn(async (v: any) => v),
      findOne: jest.fn(),
    } as any;
    currencies = {
      findByHouse: jest.fn().mockResolvedValue([
        { currencyCode: 'CUP', isLocal: true, isActive: true },
        { currencyCode: 'EUR', isLocal: false, isActive: true },
      ]),
      getLocalCurrency: jest.fn().mockResolvedValue({ currencyCode: 'CUP', isLocal: true }),
    };
    service = new InvestmentsService(
      repo as unknown as Repository<Investment>,
      currencies as unknown as HouseCurrenciesService,
    );
  });

  it('creates with a currency active in the house', async () => {
    const res = await service.create({ nombre: 'X', monto: 10, moneda: 'EUR' }, HOUSE_ID);
    expect(res.moneda).toBe('EUR');
  });

  it('rejects a currency that is not active in the house', async () => {
    await expect(service.create({ nombre: 'X', monto: 10, moneda: 'JPY' }, HOUSE_ID)).rejects.toThrow(
      new BadRequestException('La moneda JPY no está activa en esta casa'),
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('defaults to the house local currency when omitted', async () => {
    const res = await service.create({ nombre: 'X', monto: 10 }, HOUSE_ID);
    expect(res.moneda).toBe('CUP');
  });

  it('rejects an inactive currency on update', async () => {
    repo.findOne.mockResolvedValue({ id: 'i1', currency: 'CUP' } as Investment);
    await expect(service.update('i1', HOUSE_ID, { moneda: 'JPY' })).rejects.toThrow(BadRequestException);
  });

  it('updates to an active currency', async () => {
    repo.findOne.mockResolvedValue({ id: 'i1', currency: 'CUP' } as Investment);
    const res = await service.update('i1', HOUSE_ID, { moneda: 'EUR' });
    expect(res.moneda).toBe('EUR');
  });
});
