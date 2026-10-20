import apiClient from '../apiClient';
import { netWorthService } from '../netWorth.service';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const api = apiClient as jest.Mocked<typeof apiClient>;

const summary = { physicalAssets: 10, cashAssets: 5, totalAssets: 15, totalDebts: 0, netWorth: 15, assets: [] };

describe('netWorthService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getOverview sums card and loan debt into the /net-worth query and lists the liabilities', async () => {
    api.get.mockImplementation(async (url: string) => {
      if (url === '/credit-cards') {
        return { data: [{ id: 'c1', banco: 'BBVA', nombreTarjeta: 'Visa', saldoActual: '200.50' }] };
      }
      if (url === '/loans') return { data: [{ id: 'l1', institucion: 'Banco X', tipo: 'auto', deudaActual: 1000 }] };
      return { data: summary };
    });
    const overview = await netWorthService.getOverview();
    expect(api.get).toHaveBeenCalledWith('/net-worth', { params: { totalCardBalances: 200.5, totalLoanDebt: 1000 } });
    expect(overview.summary).toEqual(summary);
    expect(overview.liabilities).toEqual([
      { id: 'c1', nombre: 'BBVA Visa', monto: 200.5, kind: 'card' },
      { id: 'l1', nombre: 'Banco X', monto: 1000, kind: 'loan' },
    ]);
  });

  it('getOverview tolerates non-array cards/loans bodies', async () => {
    api.get.mockImplementation(async (url: string) => ({ data: url === '/net-worth' ? summary : null }));
    const overview = await netWorthService.getOverview();
    expect(api.get).toHaveBeenCalledWith('/net-worth', { params: { totalCardBalances: 0, totalLoanDebt: 0 } });
    expect(overview.liabilities).toEqual([]);
  });

  it('getHistory requests /net-worth/history with the months', async () => {
    api.get.mockResolvedValue({ data: [{ month: '2026-10-01', netWorth: 1, assets: 2, liabilities: 1 }] });
    expect(await netWorthService.getHistory(6)).toHaveLength(1);
    expect(api.get).toHaveBeenCalledWith('/net-worth/history', { params: { months: 6 } });
  });

  it('getHistory falls back to an empty list on a non-array body', async () => {
    api.get.mockResolvedValue({ data: null });
    expect(await netWorthService.getHistory()).toEqual([]);
    expect(api.get).toHaveBeenCalledWith('/net-worth/history', { params: { months: 12 } });
  });
});
