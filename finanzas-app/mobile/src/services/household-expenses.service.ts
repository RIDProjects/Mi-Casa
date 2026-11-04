import apiClient from './apiClient';
import {
  HouseholdExpenseSaved,
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

  create: async (data: CreateHouseholdExpenseDto): Promise<HouseholdExpenseSaved> => {
    const res = await apiClient.post<HouseholdExpenseSaved>('/household-expenses', data);
    return res.data;
  },

  update: async (
    id: string,
    data: Partial<CreateHouseholdExpenseDto>,
  ): Promise<HouseholdExpenseSaved> => {
    const res = await apiClient.put<HouseholdExpenseSaved>(`/household-expenses/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/household-expenses/${id}`);
  },
};
