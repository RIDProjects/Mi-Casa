import apiClient from './apiClient';
import {
  HouseholdExpense,
  CreateHouseholdExpenseDto,
  HouseholdExpensesMonth,
} from '../types';

export const householdExpensesService = {
  getMonth: async (month: string): Promise<HouseholdExpensesMonth> => {
    const res = await apiClient.get<HouseholdExpensesMonth>(
      `/household-expenses?month=${month}`,
    );
    return res.data;
  },

  create: async (data: CreateHouseholdExpenseDto): Promise<HouseholdExpense> => {
    const res = await apiClient.post<HouseholdExpense>('/household-expenses', data);
    return res.data;
  },

  update: async (
    id: string,
    data: Partial<CreateHouseholdExpenseDto>,
  ): Promise<HouseholdExpense> => {
    const res = await apiClient.put<HouseholdExpense>(`/household-expenses/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/household-expenses/${id}`);
  },
};
