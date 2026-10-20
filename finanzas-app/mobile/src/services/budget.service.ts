import apiClient from './apiClient';
import { Budget, Periodicity } from '../types';

export interface IncomePayload {
  name: string;
  type?: string;
  amount: number;
}

export interface CategoryPayload {
  name: string;
}

export interface ExpensePayload {
  name: string;
  amount: number;
  periodicity?: Periodicity;
  isFixed?: boolean;
  isCreditCard?: boolean;
  isAntExpense?: boolean;
}

export const budgetService = {
  getCurrent: async (): Promise<Budget | null> => {
    const res = await apiClient.get<Budget[]>('/budget');
    const list = Array.isArray(res.data) ? res.data : [];
    return list[0] ?? null;
  },

  addIncome: async (budgetId: string, data: IncomePayload) => {
    const res = await apiClient.post(`/budget/${budgetId}/income`, data);
    return res.data;
  },

  updateIncome: async (id: string, data: Partial<IncomePayload>) => {
    const res = await apiClient.put(`/budget/income/${id}`, data);
    return res.data;
  },

  removeIncome: async (id: string): Promise<void> => {
    await apiClient.delete(`/budget/income/${id}`);
  },

  addCategory: async (budgetId: string, data: CategoryPayload) => {
    const res = await apiClient.post(`/budget/${budgetId}/categories`, data);
    return res.data;
  },

  updateCategory: async (id: string, data: Partial<CategoryPayload>) => {
    const res = await apiClient.patch(`/budget/categories/${id}`, data);
    return res.data;
  },

  removeCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/budget/categories/${id}`);
  },

  addExpense: async (categoryId: string, data: ExpensePayload) => {
    const res = await apiClient.post(`/budget/categories/${categoryId}/expenses`, data);
    return res.data;
  },

  updateExpense: async (id: string, data: Partial<ExpensePayload>) => {
    const res = await apiClient.put(`/budget/expenses/${id}`, data);
    return res.data;
  },

  removeExpense: async (id: string): Promise<void> => {
    await apiClient.delete(`/budget/expenses/${id}`);
  },
};
