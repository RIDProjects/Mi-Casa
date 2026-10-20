import apiClient from './apiClient';
import { Transaction, TransactionPayload } from '../types';

export const transactionsService = {
  // Without page/limit the backend returns the month's full list; the
  // paginated shape ({ data }) is tolerated too.
  getByMonth: async (year: number, month: number): Promise<Transaction[]> => {
    const res = await apiClient.get<Transaction[] | { data: Transaction[] }>('/transactions', {
      params: { year, month },
    });
    const body = res.data;
    if (Array.isArray(body)) return body;
    return Array.isArray(body?.data) ? body.data : [];
  },

  create: async (data: TransactionPayload): Promise<Transaction> => {
    const res = await apiClient.post<Transaction>('/transactions', data);
    return res.data;
  },

  update: async (id: string, data: TransactionPayload): Promise<Transaction> => {
    const res = await apiClient.put<Transaction>(`/transactions/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
};
