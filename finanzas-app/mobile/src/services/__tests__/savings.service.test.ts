import apiClient from '../apiClient';
import { savingsService } from '../savings.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const dto = { nombre: 'Viaje', montoMeta: 1000, ahorrosActuales: 0, mesesParaAhorrarla: 6, tasaInteres: 0 };

describe('savingsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAll falls back to an empty list on a non-array body', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await savingsService.getAll()).toEqual([]);
  });

  it('create posts the payload', async () => {
    api.post.mockResolvedValue({ data: { id: 'g1' } });
    await savingsService.create(dto);
    expect(api.post).toHaveBeenCalledWith('/savings-goals', dto);
  });

  it('update puts the payload on the goal id', async () => {
    api.put.mockResolvedValue({ data: { id: 'g1' } });
    await savingsService.update('g1', { ahorrosActuales: 50 });
    expect(api.put).toHaveBeenCalledWith('/savings-goals/g1', { ahorrosActuales: 50 });
  });

  it('remove deletes the goal id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await savingsService.remove('g1');
    expect(api.delete).toHaveBeenCalledWith('/savings-goals/g1');
  });
});
