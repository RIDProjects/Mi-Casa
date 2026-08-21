import apiClient from './apiClient';
import { MonthlySummary, UpcomingBill } from '../types';

export const summaryService = {
  get: async (): Promise<MonthlySummary> => {
    const res = await apiClient.get<MonthlySummary>('/summary');
    return res.data;
  },

  getUpcomingBills: async (days = 30): Promise<UpcomingBill[]> => {
    const res = await apiClient.get<UpcomingBill[]>(`/summary/upcoming-bills?days=${days}`);
    return Array.isArray(res.data) ? res.data : [];
  },
};
