import apiClient from './apiClient';
import { SavingsGoal } from '../types';

export const savingsService = {
  getAll: async (): Promise<SavingsGoal[]> => {
    const res = await apiClient.get<SavingsGoal[]>('/savings-goals');
    return Array.isArray(res.data) ? res.data : [];
  },
};
