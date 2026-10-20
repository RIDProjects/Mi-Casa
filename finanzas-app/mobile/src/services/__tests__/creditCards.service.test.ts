import apiClient from '../apiClient';
import { creditCardsService } from '../creditCards.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const payload = {
  banco: 'Santander',
  nombreTarjeta: 'Visa Oro',
  tasaAnual: 24,
  saldoActual: 300,
  lineaCredito: 1000,
  fechaCorte: '15',
  fechaPago: '5',
  tipoPago: 'full' as const,
};

describe('creditCardsService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAll falls back to an empty list on a non-array body', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await creditCardsService.getAll()).toEqual([]);
    expect(api.get).toHaveBeenCalledWith('/credit-cards');
  });

  it('create posts the payload', async () => {
    api.post.mockResolvedValue({ data: { id: 'c1' } });
    expect(await creditCardsService.create(payload)).toEqual({ id: 'c1' });
    expect(api.post).toHaveBeenCalledWith('/credit-cards', payload);
  });

  it('update puts the payload on the card id', async () => {
    api.put.mockResolvedValue({ data: { id: 'c1' } });
    await creditCardsService.update('c1', payload);
    expect(api.put).toHaveBeenCalledWith('/credit-cards/c1', payload);
  });

  it('remove deletes the card id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await creditCardsService.remove('c1');
    expect(api.delete).toHaveBeenCalledWith('/credit-cards/c1');
  });
});
