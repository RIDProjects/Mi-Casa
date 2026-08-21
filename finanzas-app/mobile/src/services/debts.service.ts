import apiClient from './apiClient';
import { Debt, DebtsSummary, CreateDebtDto } from '../types';

export const debtsService = {
  getAll: async (): Promise<Debt[]> => {
    const res = await apiClient.get<Debt[]>('/debts');
    return res.data;
  },

  getSummary: async (): Promise<DebtsSummary> => {
    const res = await apiClient.get<DebtsSummary>('/debts/summary');
    return res.data;
  },

  create: async (data: CreateDebtDto): Promise<Debt> => {
    const res = await apiClient.post<Debt>('/debts', data);
    return res.data;
  },

  markAsPaid: async (id: string): Promise<Debt> => {
    const res = await apiClient.put<Debt>(`/debts/${id}`, { isPaid: true });
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/debts/${id}`);
  },
};
