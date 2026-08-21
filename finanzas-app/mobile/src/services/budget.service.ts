import apiClient from './apiClient';
import { Budget } from '../types';

export const budgetService = {
  getCurrent: async (): Promise<Budget | null> => {
    const res = await apiClient.get<Budget[]>('/budget');
    const list = Array.isArray(res.data) ? res.data : [];
    return list[0] ?? null;
  },
};
