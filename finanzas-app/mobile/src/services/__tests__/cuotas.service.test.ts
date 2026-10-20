import apiClient from '../apiClient';
import { cuotasService } from '../cuotas.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const payload = {
  description: 'Heladera',
  store: 'Frávega',
  totalAmount: 1200,
  totalInstallments: 12,
  installmentAmount: 100,
  startDate: '2026-10-01',
  withInterest: false,
  interestRate: 0,
  cardLastFour: '1234',
};

describe('cuotasService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAll falls back to an empty list on a non-array body', async () => {
    api.get.mockResolvedValue({ data: {} });
    expect(await cuotasService.getAll()).toEqual([]);
    expect(api.get).toHaveBeenCalledWith('/cuotas');
  });

  it('create posts the payload', async () => {
    api.post.mockResolvedValue({ data: { id: 'q1' } });
    expect(await cuotasService.create(payload)).toEqual({ id: 'q1' });
    expect(api.post).toHaveBeenCalledWith('/cuotas', payload);
  });

  it('update puts the payload on the cuota id', async () => {
    api.put.mockResolvedValue({ data: { id: 'q1' } });
    await cuotasService.update('q1', payload);
    expect(api.put).toHaveBeenCalledWith('/cuotas/q1', payload);
  });

  it('remove deletes the cuota id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await cuotasService.remove('q1');
    expect(api.delete).toHaveBeenCalledWith('/cuotas/q1');
  });

  it('pay registers one installment with an empty POST', async () => {
    api.post.mockResolvedValue({ data: { id: 'q1', paidInstallments: 3 } });
    expect(await cuotasService.pay('q1')).toEqual({ id: 'q1', paidInstallments: 3 });
    expect(api.post).toHaveBeenCalledWith('/cuotas/q1/pay');
  });
});
