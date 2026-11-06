import apiClient from './apiClient';
import { DebtHealth, MonthlySummary, UpcomingBill } from '../types';
import { toMonthlySummary } from '../utils/summary';

export const summaryService = {
  get: async (): Promise<MonthlySummary> => {
    const res = await apiClient.get('/summary');
    return toMonthlySummary(res.data);
  },

  // null when the response has no verdict (older backend), so the card just stays hidden.
  getDebtHealth: async (): Promise<DebtHealth | null> => {
    const res = await apiClient.get<DebtHealth>('/summary/debt-health');
    return res.data && typeof res.data.status === 'string' ? res.data : null;
  },

  getUpcomingBills: async (days = 30): Promise<UpcomingBill[]> => {
    const res = await apiClient.get<UpcomingBill[]>(`/summary/upcoming-bills?days=${days}`);
    return Array.isArray(res.data) ? res.data : [];
  },
};
