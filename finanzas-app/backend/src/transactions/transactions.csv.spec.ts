import { BadRequestException } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { parseCsv, toCsvLine } from './csv.util';

const user = { id: 'u1', activeHouseId: 'h1', houses: [{ id: 'h1' }], roles: [] } as any;
const req = { user } as any;

describe('TransactionsController query validation', () => {
  const txService: any = { findByMonth: jest.fn(), findByHouseAndMonth: jest.fn(), getMonthSummary: jest.fn() };
  const controller = new TransactionsController(txService);

  it.each(['13', '0', 'abc', '1.5', '-1'])('rejects month=%s with 400', (month) => {
    expect(() => controller.findByMonth(req, '2026', month)).toThrow(BadRequestException);
    expect(() => controller.getSummary(req, '2026', month)).toThrow(BadRequestException);
  });

  it('rejects a malformed year', () => {
    expect(() => controller.findByMonth(req, '20x6', '5')).toThrow(BadRequestException);
  });

  it('accepts a valid period', () => {
    controller.findByMonth(req, '2026', '9');
    expect(txService.findByMonth).toHaveBeenCalledWith('h1', 2026, 9);
  });
});

describe('CSV import/export', () => {
  it('import without a file gives 400 "Archivo requerido"', () => {
    const controller = new TransactionsController({} as any);
    expect(() => controller.importCsv(undefined as any, req)).toThrow('Archivo requerido');
    expect(() => controller.importCsv(undefined as any, req)).toThrow(BadRequestException);
  });

  it('round-trips a concept with a comma, quote and newline', async () => {
    const concept = 'Cena "La Casa", con vino\nsegunda línea';
    const exportSource: any = {
      findByHouseAndMonth: jest.fn().mockResolvedValue({
        data: [{ fecha: '2026-05-04', concepto: concept, monto: 12.5, categoria: 'Comida, bebida' }],
      }),
    };
    let csv = '';
    const res: any = { setHeader: jest.fn(), send: (body: string) => (csv = body) };
    await new TransactionsController(exportSource).exportCsv('2026', '5', req, res);

    const saved: any[] = [];
    const txRepo: any = { create: jest.fn((d) => d), save: jest.fn(async (t) => saved.push(t)) };
    const service = new TransactionsService(txRepo);
    const result = await service.importFromCsv(Buffer.from(csv, 'utf-8'), 'h1');

    expect(result).toEqual({ imported: 1, errors: [] });
    expect(saved[0]).toMatchObject({ concept, category: 'Comida, bebida', amount: 12.5, date: '2026-05-04' });
  });
});

describe('csv.util', () => {
  it('quotes only fields that need it and escapes quotes', () => {
    expect(toCsvLine(['a', 'b,c', 'd"e', null])).toBe('a,"b,c","d""e",');
  });

  it('parses CRLF, BOM and blank lines', () => {
    expect(parseCsv('\ufeffa,b\r\n\r\n"x,1",y\r\n')).toEqual([['a', 'b'], ['x,1', 'y']]);
  });

  it('treats a quote inside an unquoted field as literal', () => {
    expect(parseCsv('a,b"c,d\nx,y,z')).toEqual([['a', 'b"c', 'd'], ['x', 'y', 'z']]);
  });
});
