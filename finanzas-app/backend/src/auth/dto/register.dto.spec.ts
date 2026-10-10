import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

const base = {
  name: 'Juan Pérez',
  email: 'juan@example.com',
  password: 'Secret123!',
  houseName: 'Casa',
  housePassword: 'Casa12345!',
};

const errorsFor = async (localCurrencyCode?: string) => {
  const dto = plainToInstance(RegisterDto, { ...base, localCurrencyCode });
  const errors = await validate(dto);
  return errors.filter((e) => e.property === 'localCurrencyCode');
};

describe('RegisterDto.localCurrencyCode', () => {
  it.each(['CUP', 'USD', 'EUR'])('accepts the known currency %s', async (code) => {
    expect(await errorsFor(code)).toHaveLength(0);
  });

  it('is optional', async () => {
    expect(await errorsFor(undefined)).toHaveLength(0);
  });

  it.each(['XYZ', 'cup', 'US'])('rejects %s', async (code) => {
    expect(await errorsFor(code)).not.toHaveLength(0);
  });
});
