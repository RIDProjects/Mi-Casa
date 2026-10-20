import apiClient from '../apiClient';
import { transactionsService } from '../transactions.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const payload = {
  tipo: 'gasto' as const,
  concepto: 'Super',
  categoria: 'Comida',
  monto: 20,
  metodoPago: 'efectivo' as const,
  nombreTarjeta: '',
  fecha: '2026-10-05',
  notas: '',
};

describe('transactionsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getByMonth requests the month and returns the plain list', async () => {
    api.get.mockResolvedValue({ data: [{ id: 't1' }] });
    expect(await transactionsService.getByMonth(2026, 10)).toEqual([{ id: 't1' }]);
    expect(api.get).toHaveBeenCalledWith('/transactions', { params: { year: 2026, month: 10 } });
  });

  it('getByMonth unwraps the paginated shape', async () => {
    api.get.mockResolvedValue({ data: { data: [{ id: 't2' }], total: 1, page: 1, pages: 1 } });
    expect(await transactionsService.getByMonth(2026, 10)).toEqual([{ id: 't2' }]);
  });

  it('getByMonth falls back to an empty list on an unexpected body', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await transactionsService.getByMonth(2026, 10)).toEqual([]);
  });

  it('create posts the payload', async () => {
    api.post.mockResolvedValue({ data: { id: 't1' } });
    await transactionsService.create(payload);
    expect(api.post).toHaveBeenCalledWith('/transactions', payload);
  });

  it('update puts the payload on the transaction id', async () => {
    api.put.mockResolvedValue({ data: { id: 't1' } });
    await transactionsService.update('t1', payload);
    expect(api.put).toHaveBeenCalledWith('/transactions/t1', payload);
  });

  it('remove deletes by id', async () => {
    api.delete.mockResolvedValue({});
    await transactionsService.remove('t1');
    expect(api.delete).toHaveBeenCalledWith('/transactions/t1');
  });
});
