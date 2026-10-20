import apiClient from './apiClient';
import { SavingsGoal } from '../types';

export interface SavingsGoalPayload {
  nombre: string;
  montoMeta: number;
  ahorrosActuales: number;
  mesesParaAhorrarla: number;
  tasaInteres: number;
  emoji?: string;
}

export const savingsService = {
  getAll: async (): Promise<SavingsGoal[]> => {
    const res = await apiClient.get<SavingsGoal[]>('/savings-goals');
    return Array.isArray(res.data) ? res.data : [];
  },

  create: async (data: SavingsGoalPayload): Promise<SavingsGoal> => {
    const res = await apiClient.post<SavingsGoal>('/savings-goals', data);
    return res.data;
  },

  update: async (id: string, data: Partial<SavingsGoalPayload>): Promise<SavingsGoal> => {
    const res = await apiClient.put<SavingsGoal>(`/savings-goals/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/savings-goals/${id}`);
  },
};
