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
  it('rejects tasaAnual 24 (numeric(5,4) overflow) with a clear message', async () => {
    const [error] = await validate(plainToInstance(CreateCreditCardDto, { tasaAnual: '24' }));
    expect(error.property).toBe('tasaAnual');
    expect(Object.values(error.constraints)[0]).toContain('9.9999');
  });

  it('accepts tasaAnual at the column max', async () => {
    expect(await failed(CreateCreditCardDto, { tasaAnual: 9.9999 })).toHaveLength(0);
  });

  it('rejects tasaInteres 24 on savings goals', async () => {
    expect(await failed(CreateSavingsGoalDto, { tasaInteres: 24 })).toContain('tasaInteres');
  });

  it('rejects money amounts above numeric(12,2)', async () => {
    expect(await failed(CreateCreditCardDto, { lineaCredito: 1e12 })).toContain('lineaCredito');
    expect(await failed(CreateSavingsGoalDto, { montoMeta: 1e12 })).toContain('montoMeta');
    expect(await failed(CreateLoanDto, { deudaInicial: 1e12 })).toContain('deudaInicial');
    expect(await failed(CreateTransactionDto, { tipo: 'gasto', concepto: 'x', monto: 1e12, fecha: '2026-01-01' })).toContain('monto');
  });
});
