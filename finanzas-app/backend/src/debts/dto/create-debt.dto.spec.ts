import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDebtDto } from './create-debt.dto';

const base = { personName: 'Ana', amount: '500', type: 'i_owe' };
const errorsFor = async (body: object) => validate(plainToInstance(CreateDebtDto, body), { whitelist: true, forbidNonWhitelisted: true });

describe('CreateDebtDto priority', () => {
  it.each(['alta', 'media', 'baja'])('accepts the priority %s', async (priority) => {
    expect(await errorsFor({ ...base, priority })).toHaveLength(0);
  });

  it('keeps the priority optional (older clients do not send it)', async () => {
    expect(await errorsFor(base)).toHaveLength(0);
  });

  it('rejects an unknown priority', async () => {
    const errors = await errorsFor({ ...base, priority: 'urgente' });
    expect(errors.map(e => e.property)).toContain('priority');
  });
});
