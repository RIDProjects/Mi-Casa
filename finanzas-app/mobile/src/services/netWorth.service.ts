import apiClient from './apiClient';
import { CreditCard, NetWorthHistoryPoint, NetWorthLiability, NetWorthOverview, NetWorthSummary } from '../types';

const toList = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

export const netWorthService = {
  // Like the web page, the debts (card balances + loan debt) are computed by the
  // client and passed to the backend, which only stores the assets.
  getOverview: async (): Promise<NetWorthOverview> => {
    const [cardsRes, loansRes] = await Promise.all([
      apiClient.get<CreditCard[]>('/credit-cards'),
      apiClient.get<any[]>('/loans'),
    ]);
    const liabilities: NetWorthLiability[] = [
      ...toList<CreditCard>(cardsRes.data).map((c) => ({
        id: c.id,
        nombre: [c.banco, c.nombreTarjeta].filter(Boolean).join(' '),
        monto: Number(c.saldoActual) || 0,
        kind: 'card' as const,
      })),
      ...toList<any>(loansRes.data).map((l) => ({
        id: l.id,
        nombre: l.institucion || l.tipo || 'Crédito',
        monto: Number(l.deudaActual) || 0,
        kind: 'loan' as const,
      })),
    ];
    const sum = (kind: NetWorthLiability['kind']) =>
      liabilities.filter((l) => l.kind === kind).reduce((total, l) => total + l.monto, 0);

    const res = await apiClient.get<NetWorthSummary>('/net-worth', {
      params: { totalCardBalances: sum('card'), totalLoanDebt: sum('loan') },
    });
    return { summary: res.data, liabilities };
  },

  getHistory: async (months = 12): Promise<NetWorthHistoryPoint[]> => {
    const res = await apiClient.get<NetWorthHistoryPoint[]>('/net-worth/history', { params: { months } });
    return toList<NetWorthHistoryPoint>(res.data);
  },
};
