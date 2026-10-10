import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCreditCardDto } from '../credit-cards/dto/create-credit-card.dto';
import { CreateSavingsGoalDto } from '../savings-goals/dto/create-savings-goal.dto';
import { CreateLoanDto } from '../loans/dto/create-loan.dto';
import { CreateTransactionDto } from '../transactions/dto/create-transaction.dto';

const failed = async (cls: any, body: object) =>
  (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('numeric column limits', () => {
  it('accepts tasaAnual 24 and rejects 150 with a clear message', async () => {
    expect(await failed(CreateCreditCardDto, { tasaAnual: '24' })).toHaveLength(0);
    const [error] = await validate(plainToInstance(CreateCreditCardDto, { tasaAnual: 150 }));
    expect(error.property).toBe('tasaAnual');
    expect(Object.values(error.constraints)[0]).toContain('100');
  });

  it('accepts tasaInteres 24 and rejects 150 on savings goals', async () => {
    expect(await failed(CreateSavingsGoalDto, { tasaInteres: 24 })).toHaveLength(0);
    expect(await failed(CreateSavingsGoalDto, { tasaInteres: 150 })).toContain('tasaInteres');
  });

  it('rejects money amounts above numeric(12,2)', async () => {
    expect(await failed(CreateCreditCardDto, { lineaCredito: 1e12 })).toContain('lineaCredito');
    expect(await failed(CreateSavingsGoalDto, { montoMeta: 1e12 })).toContain('montoMeta');
    expect(await failed(CreateLoanDto, { deudaInicial: 1e12 })).toContain('deudaInicial');
    expect(await failed(CreateTransactionDto, { tipo: 'gasto', concepto: 'x', monto: 1e12, fecha: '2026-01-01' })).toContain('monto');
  });
});
