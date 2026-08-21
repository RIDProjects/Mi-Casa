import apiClient from './apiClient';
import { Transaction, CreateTransactionDto } from '../types';

export const transactionsService = {
  getByMonth: async (year: number, month: number): Promise<Transaction[]> => {
    const res = await apiClient.get<Transaction[]>(
      `/transactions?year=${year}&month=${month}`,
    );
    // La API puede devolver el array directamente o dentro de un objeto
    return Array.isArray(res.data) ? res.data : (res.data as any).data ?? [];
  },

  create: async (data: CreateTransactionDto): Promise<Transaction> => {
    const res = await apiClient.post<Transaction>('/transactions', data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },
};
