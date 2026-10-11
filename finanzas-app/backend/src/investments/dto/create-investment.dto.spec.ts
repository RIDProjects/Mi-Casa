import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInvestmentDto } from './create-investment.dto';

const errorsFor = async (moneda?: string) =>
  validate(plainToInstance(CreateInvestmentDto, { nombre: 'X', monto: 1, moneda }));

describe('CreateInvestmentDto moneda', () => {
  it('accepts EUR', async () => expect(await errorsFor('EUR')).toHaveLength(0));
  it('accepts omitted and empty', async () => {
    expect(await errorsFor(undefined)).toHaveLength(0);
    expect(await errorsFor('')).toHaveLength(0);
  });
  it('rejects eur', async () => expect(await errorsFor('eur')).not.toHaveLength(0));
  it('rejects EURO', async () => expect(await errorsFor('EURO')).not.toHaveLength(0));
});
